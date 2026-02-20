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

function isUUID(id: string) {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    /* ---------------- Provider Secret ---------------- */

    const secret = req.headers.get("x-provider-secret");
    const expected = Deno.env.get("PAYMENT_PROVIDER_SECRET");

    if (!secret || !expected || secret !== expected) {
      return json({ error: "Unauthorized" }, 401);
    }

    /* ---------------- Payload ---------------- */

    const body = await req.json().catch(() => null);
    if (!body || typeof body.provider_ref !== "string") {
      return json({ error: "Missing provider_ref" }, 400);
    }

    const provider_ref = body.provider_ref.trim();

    if (!isUUID(provider_ref)) {
      return json({ error: "Invalid reference format" }, 400);
    }

    /* ---------------- RPC Call ---------------- */

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await service.rpc(
      "confirm_employer_payment_by_ref",
      {
        p_provider_ref: provider_ref,
      }
    );

    if (error) {
      console.error("[confirm_employer_payment RPC error]", {
        provider_ref,
        error: error.message,
      });

      return json({ error: "Payment processing failed" }, 400);
    }

    /*
      Optional: enforce RPC contract.
      Example: RPC returns boolean success.
    */
    if (data !== true) {
      console.warn("[confirm_employer_payment RPC unexpected result]", {
        provider_ref,
        data,
      });

      return json({ error: "Invalid RPC response" }, 400);
    }

    return json({ ok: true });

  } catch (err) {
    console.error("[confirm_employer_payment_webhook]", err);
    return json({ error: "Server error" }, 500);
  }
});
