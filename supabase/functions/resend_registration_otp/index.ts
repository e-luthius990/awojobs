import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AT_API_KEY = Deno.env.get("AFRICAS_TALKING_API_KEY")!;
const AT_USERNAME = Deno.env.get("AFRICAS_TALKING_USERNAME")!;

const OTP_EXPIRY_MINUTES = 5;

if (!SUPABASE_URL || !SERVICE_ROLE || !AT_API_KEY || !AT_USERNAME) {
  throw new Error("Missing environment variables.");
}

/* ================= HASH ================= */

async function sha256(text: string) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ================= OTP ================= */

function generateSecureOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % 900000 + 100000).toString();
}

/* ================= EDGE ================= */

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.phone) {
      return new Response("Invalid request", { status: 400 });
    }

    const normalized = body.phone.replace(/\s+/g, "").trim();

    if (!/^\+256\d{9}$/.test(normalized)) {
      return new Response("Invalid phone number", { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    /* ================= FIND ACTIVE OTP ================= */

    const { data: otpRow } = await admin
      .from("registration_otps")
      .select("*")
      .eq("phone_number", normalized)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow) {
      return new Response("No active registration found", { status: 400 });
    }

    /* ================= GENERATE NEW OTP ================= */

    const otp = generateSecureOTP();
    const otpHash = await sha256(otp);

    /* ================= UPDATE SAME ROW ================= */

    const { error: updateError } = await admin
      .from("registration_otps")
      .update({
        otp_hash: otpHash,
        expires_at: new Date(
          Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
        ).toISOString(),
        attempts: 0,
      })
      .eq("id", otpRow.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response("Failed", { status: 500 });
    }

    /* ================= SEND SMS ================= */

    const endpoint =
      AT_USERNAME === "sandbox"
        ? "https://api.sandbox.africastalking.com/version1/messaging"
        : "https://api.africastalking.com/version1/messaging";

    const smsResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        apiKey: AT_API_KEY,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: AT_USERNAME,
        to: normalized,
        message: `Your AwoJobs code is ${otp}. Expires in 5 minutes.`,
      }),
    });

    const smsText = await smsResponse.text();

    if (!smsResponse.ok) {
      console.error("SMS failed:", smsText);
      return new Response("SMS delivery failed", { status: 500 });
    }

    console.log("Resend SMS success:", smsText);

    return new Response("OTP resent", { status: 200 });

  } catch (err) {
    console.error("Resend error:", err);
    return new Response("Internal error", { status: 500 });
  }
});