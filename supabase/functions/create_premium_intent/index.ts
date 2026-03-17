import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/* --------------------------------------------------
   Edge Entry
-------------------------------------------------- */

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

    if (!user?.id) {
      return json({ error: "Unauthorized" }, 401);
    }

    /* ---------------- PAYLOAD ---------------- */

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return json({ error: "Invalid payload" }, 400);
    }

    const { days, idempotency_key } = body;

    if (!days || ![7, 30, 90].includes(days)) {
      return json({ error: "Invalid premium duration" }, 400);
    }

    if (!idempotency_key || idempotency_key.length < 20) {
      return json({ error: "Invalid idempotency key" }, 400);
    }

    /* ---------------- RPC CALL ---------------- */

    const { data, error } = await service.rpc(
      "create_premium_payment_intent",
      {
        p_user_id: user.id,
        p_days: days,
        p_idempotency_key: idempotency_key,
      }
    );

    if (error) {
      console.error("[create_premium_intent RPC]", error);
      return json({ error: "Business rule violation" }, 400);
    }

    /* ---------------- SUCCESS ---------------- */

    return json(data);

  } catch (err) {
    console.error("[create_premium_intent]", err);
    return json({ error: "Server error" }, 500);
  }
});