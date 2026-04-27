import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

function normalizeUgPhone(phone: string): string {
  if (!phone) throw new Error("Phone required");

  const digits = phone.replace(/\D/g, "");

  let normalized: string;

  if (digits.startsWith("256") && digits.length === 12) {
    normalized = digits;
  } else if (digits.startsWith("0") && digits.length === 10) {
    normalized = `256${digits.slice(1)}`;
  } else if (digits.length === 9 && digits.startsWith("7")) {
    normalized = `256${digits}`;
  } else {
    throw new Error("Invalid Uganda mobile number");
  }

  return `+${normalized}`;
}

async function sha256(input: string) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );

  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json().catch(() => null);

    const rawPhone = typeof body?.phone === "string" ? body.phone : "";
    const rawToken = typeof body?.token === "string" ? body.token.trim() : "";
    const newPassword =
      typeof body?.new_password === "string" ? body.new_password : "";

    if (!rawPhone || !rawToken || !newPassword) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return Response.json({ error: "Weak password" }, { status: 400 });
    }

    const phone = normalizeUgPhone(rawPhone);
    const tokenHash = await sha256(rawToken);

    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone_number", phone)
      .maybeSingle();

    if (userError) {
      console.error("[confirm_password_reset:user_lookup]", userError);
      return Response.json({ error: "Reset failed" }, { status: 400 });
    }

    if (!user) {
      return Response.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    const { data: record, error: recordError } = await supabase
      .from("password_reset_tokens")
      .select("id, expires_at, used")
      .eq("user_id", user.id)
      .eq("token_hash", tokenHash)
      .eq("used", false)
      .maybeSingle();

    if (recordError) {
      console.error("[confirm_password_reset:token_lookup]", recordError);
      return Response.json({ error: "Reset failed" }, { status: 400 });
    }

    if (!record || new Date(record.expires_at).getTime() < Date.now()) {
      return Response.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("[confirm_password_reset:update_user]", updateError);
      return Response.json({ error: "Could not update password" }, { status: 400 });
    }

    const { error: markUsedError } = await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("id", record.id);

    if (markUsedError) {
      console.error("[confirm_password_reset:mark_used]", markUsedError);
      return Response.json({ error: "Reset failed" }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[confirm_password_reset]", err);
    return Response.json({ error: "Reset failed" }, { status: 400 });
  }
});