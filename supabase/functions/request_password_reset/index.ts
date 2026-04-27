import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const AT_API_KEY = Deno.env.get("AFRICAS_TALKING_API_KEY")!;
const AT_USERNAME = Deno.env.get("AFRICAS_TALKING_USERNAME")!;
const TOKEN_EXP_MIN = 10;
const RATE_LIMIT_SECONDS = 60;

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

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
      }),
    }
  );

  const rawBody = await response.text();

  console.log("[password_reset_request:sms_response]", {
    status: response.status,
    ok: response.ok,
    to: phone,
    body: rawBody,
  });

  if (!response.ok) {
    throw new Error(`SMS request failed: ${response.status} ${rawBody}`);
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json().catch(() => null);

    if (!body?.phone || typeof body.phone !== "string") {
      return Response.json({ ok: true });
    }

    const normalizedPhone = normalizeUgPhone(body.phone);

    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone_number", normalizedPhone)
      .maybeSingle();

    if (userError) {
      console.error("[password_reset_request:user_lookup]", userError);
      return Response.json({ ok: true });
    }

    if (!user) {
      console.log("[password_reset_request:user_not_found]", {
        normalizedPhone,
      });
      return Response.json({ ok: true });
    }

    const since = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();

    const { data: recentToken, error: rateLimitError } = await supabase
      .from("password_reset_tokens")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();

    if (rateLimitError) {
      console.error("[password_reset_request:rate_limit]", rateLimitError);
      return Response.json({ ok: true });
    }

    if (recentToken) {
      return Response.json({ ok: true });
    }

    const { error: deleteError } = await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[password_reset_request:delete_old_tokens]", deleteError);
      return Response.json({ ok: true });
    }

    const otp = generateOTP();
    const tokenHash = await sha256(otp);
    const expiresAt = new Date(
      Date.now() + TOKEN_EXP_MIN * 60 * 1000
    ).toISOString();

    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      console.error("[password_reset_request:insert_token]", insertError);
      return Response.json({ ok: true });
    }

    console.log("[password_reset_request:before_sms]", {
      normalizedPhone,
    });

    const message = `AwoJobs reset code: ${otp}. Expires in ${TOKEN_EXP_MIN} minutes.`;

    await sendSMS(normalizedPhone, message);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[password_reset_request]", err);
    return Response.json({ ok: true });
  }
});