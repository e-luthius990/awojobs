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
    /* ---------------- Provider Secret ---------------- */

    const secret = req.headers.get("x-provider-secret");
    if (secret !== Deno.env.get("PAYMENT_PROVIDER_SECRET")) {
      return json({ error: "Unauthorized" }, 401);
    }

    /* ---------------- Payload ---------------- */

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid payload" }, 400);
    }

    const { provider_ref } = body;

    if (!provider_ref || typeof provider_ref !== "string") {
      return json({ error: "Missing provider_ref" }, 400);
    }

    /* ---------------- RPC ---------------- */

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await service.rpc(
      "confirm_premium_payment",
      {
        p_provider_ref: provider_ref,
      }
    );

    if (error) {
      console.error("[confirm_premium_payment RPC]", error);
      return json({ error: "Payment processing failed" }, 400);
    }

    return json({ ok: true });

  } catch (err) {
    console.error("[confirm_premium_payment]", err);
    return json({ error: "Server error" }, 500);
  }
});
