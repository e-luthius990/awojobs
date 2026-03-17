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

    /* ---------------- DB Update ---------------- */

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await service
      .from("payments")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("provider_ref", provider_ref)
      .eq("status", "initiated")
      .eq("consumed", false)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[payments update error]", error);
      return json({ error: "Payment update failed" }, 400);
    }

    if (!data) {
      // idempotent safe return
      return json({ ok: true });
    }

    return json({ ok: true });

  } catch (err) {
    console.error("[payment_webhook]", err);
    return json({ error: "Server error" }, 500);
  }
});