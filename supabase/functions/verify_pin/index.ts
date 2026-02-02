import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------------------------------------------
   Helpers
---------------------------------------------- */

function normalizePhone(phone: string): string {
  if (phone.startsWith("+")) return phone;
  if (phone.startsWith("0")) return "+256" + phone.slice(1);
  return "+256" + phone;
}

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------------------------------------------
   Handler
---------------------------------------------- */

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Not allowed", { status: 405 });
    }

    const { phone, pin } = await req.json().catch(() => ({}));
    if (!phone || !pin || pin.length < 4 || pin.length > 6) {
      return new Response("Invalid credentials", { status: 401 });
    }

    const normalizedPhone = normalizePhone(phone);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    /* ---------------------------------------------
       Fetch user (generic failure)
    ---------------------------------------------- */
    const { data: userRes } =
      await supabase.auth.admin.getUserByPhone(normalizedPhone);

    if (!userRes?.user?.id) {
      return new Response("Invalid credentials", { status: 401 });
    }

    const userId = userRes.user.id;

    /* ---------------------------------------------
       Load profile
    ---------------------------------------------- */
    const { data: profile } = await supabase
      .from("profiles")
      .select("pin_hash, pin_attempts, pin_locked_until")
      .eq("id", userId)
      .single();

    if (!profile?.pin_hash) {
      return new Response("Invalid credentials", { status: 401 });
    }

    /* ---------------------------------------------
       Lock check (silent)
    ---------------------------------------------- */
    if (
      profile.pin_locked_until &&
      new Date(profile.pin_locked_until) > new Date()
    ) {
      return new Response("Invalid credentials", { status: 401 });
    }

    /* ---------------------------------------------
       Verify PIN
    ---------------------------------------------- */
    const pinHash = await hashPin(pin);

    if (pinHash !== profile.pin_hash) {
      const attempts = (profile.pin_attempts ?? 0) + 1;

      let lockUntil: string | null = null;

      // Progressive backoff (Play-store friendly)
      if (attempts >= 10) {
        lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min
      } else if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
      }

      await supabase
        .from("profiles")
        .update({
          pin_attempts: attempts,
          pin_locked_until: lockUntil,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      return new Response("Invalid credentials", { status: 401 });
    }

    /* ---------------------------------------------
       SUCCESS → reset counters
    ---------------------------------------------- */
    await supabase
      .from("profiles")
      .update({
        pin_attempts: 0,
        pin_locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    /* ---------------------------------------------
       Create NEW session FIRST
    ---------------------------------------------- */
    const { data: session } =
      await supabase.auth.admin.createSession({ user_id: userId });

    /* ---------------------------------------------
       Revoke old sessions AFTER
    ---------------------------------------------- */
    await supabase.auth.admin.invalidateUserSessions(userId);

    return new Response(JSON.stringify(session), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify_pin error:", err);
    return new Response("Server error", { status: 500 });
  }
});
