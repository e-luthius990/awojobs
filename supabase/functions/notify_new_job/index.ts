// supabase/functions/notify_new_job/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

const WINDOW_MINUTES = 10;
const NORMAL_LIMIT_PER_WINDOW = 3;
const URGENT_LIMIT_PER_WINDOW = 2;
const GLOBAL_HOURLY_LIMIT = 10;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function isValidExpoToken(token: string) {
  return typeof token === "string" && token.startsWith("ExponentPushToken");
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    /* ---------------- AUTH ---------------- */

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: userRes } = await anon.auth.getUser();
    const user = userRes?.user;

    if (!user) {
      return json({ error: "invalid_session" }, 401);
    }

    const requester_id = user.id;

    /* ---------------- INPUT ---------------- */

    const body = await req.json().catch(() => null);
    if (!body?.job_id) {
      return json({ error: "job_id_required" }, 400);
    }

    const job_id = String(body.job_id);
    const urgent = Boolean(body.urgent);

    /* ---------------- SERVICE CLIENT ---------------- */

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    /* ---------------- SQL AUTHORIZATION ---------------- */

    const { data: authResult, error: authError } =
      await service.rpc("authorize_job_notification", {
        p_user_id: requester_id,
        p_job_id: job_id,
        p_is_urgent: urgent,
      });

    if (authError) {
      console.error("[notify_new_job RPC]", authError);
      return json({ error: "database_error" }, 500);
    }

    if (!authResult?.ok) {
      return json(
        { error: authResult?.error ?? "authorization_failed" },
        403
      );
    }

    const location_id = authResult.location_id;
    const jobTitle = authResult.title;

    /* ---------------- RATE LIMIT ---------------- */

    const now = Date.now();
    const windowStart = new Date(
      now - WINDOW_MINUTES * 60_000
    ).toISOString();
    const hourStart = new Date(
      now - 60 * 60_000
    ).toISOString();

    const limit = urgent
      ? URGENT_LIMIT_PER_WINDOW
      : NORMAL_LIMIT_PER_WINDOW;

    const { count: windowCount } = await service
      .from("push_notify_log")
      .select("id", { count: "exact", head: true })
      .eq("requester_id", requester_id)
      .eq("job_id", job_id)
      .gte("created_at", windowStart);

    if ((windowCount ?? 0) >= limit) {
      return json({ error: "rate_limited" }, 429);
    }

    const { count: hourlyCount } = await service
      .from("push_notify_log")
      .select("id", { count: "exact", head: true })
      .eq("requester_id", requester_id)
      .gte("created_at", hourStart);

    if ((hourlyCount ?? 0) >= GLOBAL_HOURLY_LIMIT) {
      return json({ error: "hourly_rate_limit" }, 429);
    }

    /* ---------------- LOAD DEVICES ---------------- */

    const { data: devices } = await service
      .from("device_push_tokens")
      .select("expo_push_token")
      .eq("location_id", location_id)
      .eq("push_opt_in", true)
      .not("expo_push_token", "is", null);

    const tokens = [
      ...new Set(
        (devices ?? [])
          .map((d) => d.expo_push_token)
          .filter(isValidExpoToken)
      ),
    ];

    /* ---------------- LOG ATTEMPT ---------------- */

    await service.from("push_notify_log").insert({
      requester_id,
      job_id,
      location_id,
      is_urgent: urgent,
      recipients: tokens.length,
    });

    if (tokens.length === 0) {
      return json({ ok: true, recipients: 0 });
    }

    /* ---------------- BUILD PUSH ---------------- */

    const title = urgent
      ? "URGENT: Job near you"
      : "New job near you";

    const messages = tokens.map((to) => ({
      to,
      sound: "default",
      title,
      body: jobTitle.slice(0, 140),
      priority: urgent ? "high" : "default",
    }));

    /* ---------------- SEND PUSH ---------------- */

    let sent = 0;

    for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
      const batch = messages.slice(i, i + EXPO_BATCH_SIZE);

      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });

      if (!res.ok) continue;

      const result = await res.json();

      if (Array.isArray(result.data)) {
        sent += result.data.filter(
          (r: any) => r.status === "ok"
        ).length;
      }
    }

    return json({
      ok: true,
      recipients: sent,
      urgent,
    });

  } catch (err) {
    console.error("[notify_new_job]", err);
    return json({ error: "internal_error" }, 500);
  }
});
