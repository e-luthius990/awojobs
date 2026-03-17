// supabase/functions/notify_new_job_auto/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;
const MAX_RECIPIENTS = 5000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isValidExpoToken(token: string) {
  return typeof token === "string" &&
    (token.startsWith("ExponentPushToken[") ||
     token.startsWith("ExpoPushToken["));
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    const secret = req.headers.get("x-internal-secret");
    if (secret !== Deno.env.get("NOTIFY_SECRET")) {
      return json({ error: "unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body?.job_id) {
      return json({ error: "job_id_required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    /* ---------------- LOAD JOB ---------------- */

    const { data: job } = await supabase
      .from("jobs")
      .select("id, title, location_id, status, expires_at")
      .eq("id", body.job_id)
      .single();

    if (!job) return json({ ok: false });

    if (
      job.status !== "active" ||
      (job.expires_at && new Date(job.expires_at) <= new Date())
    ) {
      return json({ ok: false });
    }

    /* ---------------- LOCAL DEVICES ---------------- */

    const { data: localDevices } = await supabase
      .from("device_push_tokens")
      .select("expo_push_token")
      .eq("location_id", job.location_id)
      .eq("push_opt_in", true)
      .limit(MAX_RECIPIENTS);

    /* ---------------- PREMIUM DEVICES ---------------- */

    const { data: premiumUsers } = await supabase
      .from("job_seeker_premium")
      .select("user_id")
      .eq("status", "confirmed")
      .gt("expires_at", new Date().toISOString());

    let premiumTokens: string[] = [];

    if (premiumUsers?.length) {
      const userIds = premiumUsers.map((u) => u.user_id);

      const { data: premiumDevices } = await supabase
        .from("device_push_tokens")
        .select("expo_push_token")
        .in("user_id", userIds)
        .eq("push_opt_in", true)
        .limit(MAX_RECIPIENTS);

      premiumTokens =
        (premiumDevices ?? [])
          .map((d) => d.expo_push_token)
          .filter(isValidExpoToken);
    }

    const localTokens =
      (localDevices ?? [])
        .map((d) => d.expo_push_token)
        .filter(isValidExpoToken);

    const tokens = [...new Set([...localTokens, ...premiumTokens])];

    if (tokens.length === 0) {
      return json({ ok: true, recipients: 0 });
    }

    /* ---------------- SEND PUSH ---------------- */

    const messages = tokens.map((to) => ({
      to,
      sound: "default",
      title: "New job near you",
      body: job.title.slice(0, 140),
      priority: "default",
      data: { job_id: job.id },
    }));

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

    return json({ ok: true, recipients: sent });

  } catch (err) {
    console.error("[notify_new_job_auto]", err);
    return json({ error: "internal_error" }, 500);
  }
});
