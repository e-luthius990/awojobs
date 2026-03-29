// supabase/functions/check_payment_status/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const POLL_LIMIT_PER_MIN = 30;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function isUUID(id: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    id,
  );
}

type ClientPaymentStatus =
  | "pending"
  | "confirmed"
  | "failed"
  | "expired"
  | "unknown";

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "").trim();
    const {
      data: authRes,
      error: authError,
    } = await anon.auth.getUser(token);

    if (authError || !authRes?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = authRes.user.id;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

    const { count, error: rateCountError } = await service
      .from("payment_status_poll_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneMinuteAgo);

    if (rateCountError) {
      console.error("[check_payment_status rate-count]", rateCountError);
      return json({ error: "Could not process request" }, 500);
    }

    if ((count ?? 0) >= POLL_LIMIT_PER_MIN) {
      return json({ error: "Too many requests" }, 429);
    }

    const { error: rateInsertError } = await service
      .from("payment_status_poll_log")
      .insert({ user_id: userId });

    if (rateInsertError) {
      console.error("[check_payment_status rate-log]", rateInsertError);
      return json({ error: "Could not process request" }, 500);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.intent_id !== "string") {
      return json({ error: "Missing intent_id" }, 400);
    }

    const intentId = body.intent_id.trim();

    if (!isUUID(intentId)) {
      return json({ error: "Invalid intent_id" }, 400);
    }

    const { data, error: lookupError } = await service
      .from("employer_payments")
      .select("status, job_id, expires_at")
      .eq("id", intentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (lookupError) {
      console.error("[check_payment_status lookup]", lookupError);
      return json({ error: "Lookup failed" }, 500);
    }

    if (!data) {
      return json({
        status: "unknown" satisfies ClientPaymentStatus,
        job_id: null,
      });
    }

    let normalizedStatus: ClientPaymentStatus;

    if (
      data.expires_at &&
      new Date(data.expires_at).getTime() <= Date.now() &&
      (data.status === "initiated" || data.status === "pending")
    ) {
      normalizedStatus = "expired";
    } else if (data.status === "confirmed") {
      normalizedStatus = "confirmed";
    } else if (data.status === "failed") {
      normalizedStatus = "failed";
    } else if (data.status === "expired") {
      normalizedStatus = "expired";
    } else if (data.status === "initiated" || data.status === "pending") {
      normalizedStatus = "pending";
    } else {
      normalizedStatus = "unknown";
    }

    return json({
      status: normalizedStatus,
      job_id: data.job_id ?? null,
    });
  } catch (err) {
    console.error("[check_payment_status]", err);
    return json({ error: "Server error" }, 500);
  }
});