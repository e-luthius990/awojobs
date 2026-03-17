import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const AT_API_KEY = Deno.env.get("AFRICAS_TALKING_API_KEY")!;
const AT_USERNAME = Deno.env.get("AFRICAS_TALKING_USERNAME")!;
const AT_SENDER = Deno.env.get("AFRICAS_TALKING_SENDER_ID")!;

const TOKEN_EXP_MIN = 10;
const RATE_LIMIT_SECONDS = 60;

/* =====================================================
   HELPERS
===================================================== */

function normalizeUgPhone(phone: string): string {
  if (!phone) throw new Error("Phone required");

  const digits = phone.replace(/\D/g, "");

  let normalized: string;

  if (digits.startsWith("256") && digits.length === 12) {
    normalized = digits;
  } else if (digits.startsWith("0") && digits.length === 10) {
    normalized = "256" + digits.slice(1);
  } else if (digits.length === 9 && digits.startsWith("7")) {
    normalized = "256" + digits;
  } else {
    throw new Error("Invalid Uganda phone format");
  }

  if (!/^2567\d{8}$/.test(normalized)) {
    throw new Error("Invalid Uganda mobile number");
  }

  return "+" + normalized; // 🔥 THIS LINE FIXES EVERYTHING
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
        from: AT_SENDER,
      }),
    }
  );

  if (!response.ok) {
    console.error("SMS failed:", await response.text());
  }
}

/* =====================================================
   EDGE ENTRY
===================================================== */

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body?.phone) {
      return Response.json({ ok: true });
    }

    const normalized = normalizeUgPhone(body.phone);

    /* -----------------------------------------
       RATE LIMIT
    ------------------------------------------ */

    const since = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();

    const { count } = await supabase
      .from("password_reset_tokens")
      .select("id", { count: "exact", head: true })
      .eq("phone_number", normalized)
      .gte("created_at", since);

    if ((count ?? 0) > 0) {
      return Response.json({ ok: true });
    }

    /* -----------------------------------------
       LOOKUP USER (NO ENUMERATION)
    ------------------------------------------ */

    const { data: user } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone_number", normalized)
      .maybeSingle();

    if (!user) {
      return Response.json({ ok: true });
    }

    /* -----------------------------------------
       CLEAN OLD TOKENS
    ------------------------------------------ */

    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("user_id", user.id);

    /* -----------------------------------------
       CREATE NEW TOKEN
    ------------------------------------------ */

    const otp = generateOTP();
    const tokenHash = await sha256(otp);

    const expires = new Date(
      Date.now() + TOKEN_EXP_MIN * 60 * 1000
    ).toISOString();

    await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      phone_number: normalized,
      token_hash: tokenHash,
      expires_at: expires,
      attempts: 0,
    });

    /* -----------------------------------------
       SEND SMS
    ------------------------------------------ */

    const message = `AwoJobs reset code: ${otp}. Expires in ${TOKEN_EXP_MIN} minutes.`;

    await sendSMS(normalized, message);

    return Response.json({ ok: true });

  } catch (err) {
    console.error("[password_reset_request]", err);
    return Response.json({ ok: true });
  }
});