// supabase/functions/create_job_intent/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */

const USER_LIMIT_PER_MIN = 5;

/* -------------------------------------------------------
   HELPER
------------------------------------------------------- */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/* -------------------------------------------------------
   EDGE ENTRY
------------------------------------------------------- */

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    /* ---------------- AUTH ---------------- */

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

    /* ---------------- RATE LIMIT (Transport-Level Only) ---------------- */

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

    const { count } = await service
      .from("employer_payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneMinuteAgo);

    if ((count ?? 0) >= USER_LIMIT_PER_MIN) {
      return json({ error: "Too many requests" }, 429);
    }

    /* ---------------- PAYLOAD ---------------- */

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return json({ error: "Invalid payload" }, 400);
    }

    const { job, sponsorship, idempotency_key } = body;

    if (!job || !idempotency_key) {
      return json({ error: "Missing required fields" }, 400);
    }

    if (typeof idempotency_key !== "string" || idempotency_key.length < 10) {
      return json({ error: "Invalid idempotency key" }, 400);
    }

    /* ---------------- RPC CALL ---------------- */

    const { data, error } = await service.rpc(
      "create_job_payment_intent",
      {
        p_user_id: user.id,
        p_job: job,
        p_sponsorship: sponsorship ?? null,
        p_idempotency_key: idempotency_key,
      }
    );

    if (error) {
      console.error("[create_job_intent RPC]", error);
      return json({ error: "Business rule violation" }, 400);
    }

    /* ---------------- SUCCESS ---------------- */

    return json(data);

  } catch (err) {
    console.error("[create_job_intent]", err);
    return json({ error: "Server error" }, 500);
  }
});
