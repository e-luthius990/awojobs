// supabase/functions/create_sponsor_upgrade_intent/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const USER_LIMIT_PER_MIN = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: authRes } = await service.auth.getUser(token);
    const user = authRes?.user;

    if (!user) {
      return json({ error: "Unauthorized" }, 401);
    }

    /* ---------------- RATE LIMIT ---------------- */

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

    const { count } = await service
      .from("payment_intents_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "sponsor_upgrade")
      .gte("created_at", oneMinuteAgo);

    if ((count ?? 0) >= USER_LIMIT_PER_MIN) {
      return json({ error: "Too many requests" }, 429);
    }

    await service.from("payment_intents_log").insert({
      user_id: user.id,
      type: "sponsor_upgrade",
    });

    /* ---------------- PAYLOAD ---------------- */

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid payload" }, 400);
    }

    const { job_id, sponsorship, idempotency_key } = body;

    const uuidRegex = /^[0-9a-fA-F-]{36}$/;
    if (!uuidRegex.test(job_id)) {
      return json({ error: "Invalid job_id" }, 400);
    }

    if (!/^[a-zA-Z0-9_-]{20,}$/.test(idempotency_key)) {
      return json({ error: "Invalid idempotency key" }, 400);
    }

    if (
      sponsorship !== "sponsored_day" &&
      sponsorship !== "sponsored_week" &&
      sponsorship !== "sponsored_month"
    ) {
      return json({ error: "Invalid sponsorship type" }, 400);
    }

    /* ---------------- RPC CALL ---------------- */

    const { data, error } = await service.rpc(
      "create_sponsor_upgrade_intent",
      {
        p_user_id: user.id,
        p_job_id: job_id,
        p_sponsorship: sponsorship,
        p_idempotency_key: idempotency_key,
      }
    );

    if (error) {
      console.error("[create_sponsor_upgrade_intent RPC]", error);
      return json({ error: "Business rule violation" }, 400);
    }

    return json(data);

  } catch (err) {
    console.error("[create_sponsor_upgrade_intent]", err);
    return json({ error: "Server error" }, 500);
  }
});