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
    /* ================= AUTH (ANON CLIENT) ================= */

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: authRes } = await anon.auth.getUser(token);
    const user = authRes?.user;

    if (!user) {
      return json({ error: "Unauthorized" }, 401);
    }

    /* ================= SERVICE CLIENT ================= */

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    /* ================= RATE LIMIT ================= */

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

    const { count } = await service
      .from("payment_intents_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneMinuteAgo);

    if ((count ?? 0) >= USER_LIMIT_PER_MIN) {
      return json({ error: "Too many requests" }, 429);
    }

    await service.from("payment_intents_log").insert({
      user_id: user.id,
    });

    /* ================= PAYLOAD ================= */

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid payload" }, 400);
    }

    const { draft_id, sponsorship, mode, idempotency_key } = body;

    if (!draft_id || !mode || !idempotency_key) {
      return json({ error: "Missing required fields" }, 400);
    }

    if (!["create", "renew"].includes(mode)) {
      return json({ error: "Invalid mode" }, 400);
    }

    const allowedSponsorship = [
      null,
      "sponsored_day",
      "sponsored_week",
      "sponsored_month",
    ];

    if (!allowedSponsorship.includes(sponsorship ?? null)) {
      return json({ error: "Invalid sponsorship option" }, 400);
    }

    if (typeof idempotency_key !== "string" || idempotency_key.length < 20) {
      return json({ error: "Invalid idempotency key" }, 400);
    }

    /* ================= VERIFY JOB OWNERSHIP ================= */

    const { data: job, error: jobError } = await service
      .from("jobs")
      .select("status, employer_id")
      .eq("id", draft_id)
      .single();

    if (jobError || !job) {
      return json({ error: "Job not found" }, 404);
    }

    if (job.employer_id !== user.id) {
      return json({ error: "Unauthorized" }, 403);
    }

    if (mode === "create" && job.status !== "draft") {
      return json({ error: "Invalid job state for creation" }, 400);
    }

    if (mode === "renew" && job.status !== "expired") {
      return json({ error: "Only expired jobs can be renewed" }, 400);
    }

    /* ================= RPC ================= */

    const { data, error } = await service.rpc(
      "create_job_payment_intent",
      {
        p_user_id: user.id,
        p_draft_id: draft_id,
        p_sponsorship: sponsorship ?? null,
        p_idempotency_key: idempotency_key,
        p_mode: mode,
      }
    );

    if (error) {
      console.error("[create_job_intent RPC]", error);
      return json({ error: "Business rule violation" }, 400);
    }

    return json({
      intent_id: data.intent_id,
      payment_reference: data.payment_reference,
      amount: data.amount,
    });

  } catch (err) {
    console.error("[create_job_intent]", err);
    return json({ error: "Server error" }, 500);
  }
});