import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Not allowed", { status: 405 });
    }

    /* ---------------------------------------------
       AUTH HEADER
    ---------------------------------------------- */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const token = authHeader.slice(7);

    /* ---------------------------------------------
       INPUT VALIDATION
    ---------------------------------------------- */
    const { pin } = await req.json().catch(() => ({}));
    if (!pin || pin.length < 4 || pin.length > 6) {
      return new Response("Invalid request", { status: 400 });
    }

    /* ---------------------------------------------
       SUPABASE ADMIN CLIENT
    ---------------------------------------------- */
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    /* ---------------------------------------------
       VERIFY ACCESS TOKEN
    ---------------------------------------------- */
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = data.user.id;

    /* ---------------------------------------------
       HASH + UPDATE PIN
    ---------------------------------------------- */
    const pinHash = await hashPin(pin);

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        pin_hash: pinHash,
        pin_attempts: 0,
        pin_locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateErr) {
      console.error("PIN update failed", updateErr);
      return new Response("Unable to save PIN", { status: 500 });
    }

    /* ---------------------------------------------
       SESSION ROTATION (SAFE)
       - Do NOT revoke current token
       - Supabase rotates automatically on next auth
    ---------------------------------------------- */
    // ❌ DO NOT invalidate here — client still needs token

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("set_pin error:", err);
    return new Response("Server error", { status: 500 });
  }
});
