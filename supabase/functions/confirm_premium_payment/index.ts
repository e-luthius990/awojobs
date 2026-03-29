import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const secret = req.headers.get("x-provider-secret");
    if (secret !== Deno.env.get("PAYMENT_PROVIDER_SECRET")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid payload" }, 400);
    }

    const providerRef =
      "provider_ref" in body && typeof body.provider_ref === "string"
        ? body.provider_ref.trim()
        : "";

    if (!providerRef) {
      return json({ error: "Missing provider_ref" }, 400);
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await service
      .from("payments")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("provider_ref", providerRef)
      .eq("payment_type", "premium_upgrade")
      .eq("consumed", false)
      .in("status", ["initiated", "pending"])
      .select("id, provider_ref, payment_type, status")
      .maybeSingle();

    if (error) {
      console.error("[payment_webhook:update]", {
        provider_ref: providerRef,
        error,
      });
      return json({ error: "Payment update failed" }, 400);
    }

    if (!data) {
      return json({ ok: true });
    }

    return json({
      ok: true,
      payment_id: data.id,
    });
  } catch (err) {
    console.error("[payment_webhook]", err);
    return json({ error: "Server error" }, 500);
  }
});