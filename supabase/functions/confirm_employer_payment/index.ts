// supabase/functions/confirm_employer_payment/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

const ALLOWED_PROVIDERS = ["flutterwave", "mtn_momo", "airtel_money"];

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const secret = req.headers.get("x-provider-secret");
    const expected = Deno.env.get("PAYMENT_PROVIDER_SECRET");

    if (!secret || !expected || secret !== expected) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);

    const provider = body?.provider;
    const provider_ref = body?.provider_ref;
    const amount = body?.amount;
    const currency = body?.currency ?? "UGX";

    if (!isNonEmptyString(provider) || !isNonEmptyString(provider_ref)) {
      return json({ error: "Missing provider/provider_ref" }, 400);
    }

    if (!ALLOWED_PROVIDERS.includes(provider.trim())) {
      return json({ error: "Invalid provider" }, 400);
    }

    if (amount != null && (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)) {
      return json({ error: "Invalid amount" }, 400);
    }

    if (!isNonEmptyString(currency)) {
      return json({ error: "Invalid currency" }, 400);
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await service.rpc("confirm_employer_payment_by_ref", {
      p_provider: provider.trim(),
      p_provider_ref: provider_ref.trim(),
      p_amount: amount ?? null,
      p_currency: currency.trim().toUpperCase(),
    });

    if (error) {
      console.error("[confirm_employer_payment_by_ref]", {
        provider,
        provider_ref,
        amount,
        currency,
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      return json(
        {
          error: error.message || "Payment processing failed",
          code: error.code ?? null,
        },
        400,
      );
    }

    if (data !== true) {
      console.warn("[confirm_employer_payment_by_ref unexpected]", {
        provider,
        provider_ref,
        amount,
        currency,
        data,
      });

      return json({ error: "Invalid RPC response" }, 400);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[confirm_employer_payment]", err);
    return json({ error: "Server error" }, 500);
  }
});