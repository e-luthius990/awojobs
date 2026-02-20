import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const AT_API_KEY = Deno.env.get("AFRICAS_TALKING_API_KEY")!;
const AT_USERNAME = Deno.env.get("AFRICAS_TALKING_USERNAME")!;
const AT_SENDER = Deno.env.get("AFRICAS_TALKING_SENDER_ID")!;

function normalizeUgPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("256")) return "+" + cleaned;
  if (cleaned.startsWith("0")) return "+256" + cleaned.slice(1);

  throw new Error("Invalid phone");
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

async function sendSMS(phone: string, message: string) {
  const response = await fetch(
    "https://api.africastalking.com/version1/messaging",
    {
      method: "POST",
      headers: {
        apiKey: AT_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        username: AT_USERNAME,
        to: phone,
        message,
        from: AT_SENDER,
      }),
    }
  );

  if (!response.ok) {
    console.error("SMS send failed:", await response.text());
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { phone } = await req.json();
    const normalized = normalizeUgPhone(phone);

    const { data: user } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone_number", normalized)
      .maybeSingle();

    // Always generic success (no enumeration)
    if (!user) {
      return Response.json({ ok: true });
    }

    const token = crypto.randomUUID().slice(0, 6); // shorter for SMS
    const tokenHash = await sha256(token);

    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expires.toISOString(),
    });

    const message = `AwoJobs password reset code: ${token}. Expires in 10 minutes.`;

    await sendSMS(normalized, message);

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: true });
  }
});
