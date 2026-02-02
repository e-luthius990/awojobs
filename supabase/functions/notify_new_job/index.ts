import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

const WINDOW_MINUTES = 10;
const NORMAL_LIMIT_PER_WINDOW = 3;
const URGENT_LIMIT_PER_WINDOW = 2;
const GLOBAL_HOURLY_LIMIT = 10;

function json(resBody: unknown, status = 200) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    // Require caller auth token (prevents random internet abuse)
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!bearer) return json({ error: "Missing Authorization Bearer token" }, 401);

    const body = await req.json().catch(() => null);
    if (!body?.location_id || !body?.title) return json({ error: "Invalid payload" }, 400);

    const location_id = String(body.location_id);
    const title = String(body.title).slice(0, 140); // keep push body short
    const urgent = Boolean(body.urgent);

    // Admin client (service role) for DB + sending
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Verify caller identity using the token provided
    const { data: caller, error: callerErr } = await supabaseAdmin.auth.getUser(bearer);
    if (callerErr || !caller?.user?.id) return json({ error: "Invalid token" }, 401);
    const requester_id = caller.user.id;

    /* ---------------------------------------------
       RATE LIMIT CHECKS
    ---------------------------------------------- */
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const hourStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // 1) Per-location window limit (normal vs urgent)
    const { count: recentCount, error: recentErr } = await supabaseAdmin
      .from("push_notify_log")
      .select("id", { count: "exact", head: true })
      .eq("requester_id", requester_id)
      .eq("location_id", location_id)
      .gte("created_at", windowStart);

    if (recentErr) {
      console.error("Rate limit query error:", recentErr);
      return json({ error: "Rate limit check failed" }, 500);
    }

    const limit = urgent ? URGENT_LIMIT_PER_WINDOW : NORMAL_LIMIT_PER_WINDOW;
    if ((recentCount ?? 0) >= limit) {
      return json(
        { error: "Rate limited", retry_after_minutes: WINDOW_MINUTES },
        429
      );
    }

    // 2) Global hourly cap
    const { count: hourlyCount, error: hourlyErr } = await supabaseAdmin
      .from("push_notify_log")
      .select("id", { count: "exact", head: true })
      .eq("requester_id", requester_id)
      .gte("created_at", hourStart);

    if (hourlyErr) {
      console.error("Hourly cap query error:", hourlyErr);
      return json({ error: "Rate limit check failed" }, 500);
    }

    if ((hourlyCount ?? 0) >= GLOBAL_HOURLY_LIMIT) {
      return json(
        { error: "Hourly rate limited", retry_after_minutes: 60 },
        429
      );
    }

    /* ---------------------------------------------
       RECIPIENTS (UNSUBSCRIBE LOGIC)
       Only:
         - same location
         - token exists
         - push_opt_in = true
    ---------------------------------------------- */
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("expo_push_token")
      .eq("resolved_location_id", location_id)
      .eq("push_opt_in", true)
      .not("expo_push_token", "is", null);

    if (profErr) {
      console.error("Profiles query error:", profErr);
      return json({ error: "Database error" }, 500);
    }

    // Log the attempt (counts toward rate limit even if no recipients)
    await supabaseAdmin.from("push_notify_log").insert({
      requester_id,
      location_id,
      is_urgent: urgent,
    });

    if (!profiles || profiles.length === 0) {
      return json({ ok: true, recipients: 0 });
    }

    /* ---------------------------------------------
       BUILD PUSH MESSAGES (URGENT PRIORITY)
    ---------------------------------------------- */
    const pushTitle = urgent ? "URGENT: Job near you" : "New job near you";

    const messages = profiles.map((p) => ({
      to: p.expo_push_token,
      sound: "default",
      title: pushTitle,
      body: title,
      priority: urgent ? "high" : "default",
    }));

    /* ---------------------------------------------
       SEND IN BATCHES
    ---------------------------------------------- */
    let sent = 0;

    for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
      const batch = messages.slice(i, i + EXPO_BATCH_SIZE);

      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Expo push error:", text);
      } else {
        sent += batch.length;
      }
    }

    return json({ ok: true, recipients: sent, urgent });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
