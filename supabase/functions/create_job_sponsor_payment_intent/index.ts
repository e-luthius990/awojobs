// supabase/functions/create_job_sponsor_payment_intent/index.ts

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

    const token = authHeader.replace("Bearer ", "").trim();

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: authRes, error: authError } = await anon.auth.getUser(token);
    const user = authRes?.user;

    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

    const { count, error: rateCountError } = await service
      .from("payment_intents_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneMinuteAgo);

    if (rateCountError) {
      console.error("[create_job_sponsor_payment_intent rate count]", rateCountError);
      return json({ error: "Rate limit check failed" }, 500);
    }

    if ((count ?? 0) >= USER_LIMIT_PER_MIN) {
      return json({ error: "Too many requests" }, 429);
    }

    const { error: rateInsertError } = await service
      .from("payment_intents_log")
      .insert({
        user_id: user.id,
      });

    if (rateInsertError) {
      console.error("[create_job_sponsor_payment_intent rate insert]", rateInsertError);
      return json({ error: "Rate limit log failed" }, 500);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid payload" }, 400);
    }

    const { job_id, sponsorship, idempotency_key } = body as {
      job_id?: string;
      sponsorship?: string;
      idempotency_key?: string;
    };

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!job_id || !uuidRegex.test(job_id)) {
      return json({ error: "Invalid job_id" }, 400);
    }

    if (
      sponsorship !== "sponsored_day" &&
      sponsorship !== "sponsored_week" &&
      sponsorship !== "sponsored_month"
    ) {
      return json({ error: "Invalid sponsorship type" }, 400);
    }

    if (
      typeof idempotency_key !== "string" ||
      !/^[a-zA-Z0-9_-]{20,}$/.test(idempotency_key)
    ) {
      return json({ error: "Invalid idempotency key" }, 400);
    }

    const { data, error } = await service.rpc(
      "create_job_sponsor_payment_intent",
      {
        p_user_id: user.id,
        p_job_id: job_id,
        p_sponsorship: sponsorship,
        p_idempotency_key: idempotency_key,
      }
    );

    if (error) {
      console.error("[create_job_sponsor_payment_intent RPC]", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      return json(
        {
          error: error.message || "Business rule violation",
          code: error.code ?? null,
        },
        400
      );
    }

    return json(data, 200);
  } catch (err) {
    console.error("[create_job_sponsor_payment_intent]", err);
    return json({ error: "Server error" }, 500);
  }
});