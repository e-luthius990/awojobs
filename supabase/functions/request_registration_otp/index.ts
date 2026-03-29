import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ================= ENV ================= */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_KEY = (Deno.env.get("PASSWORD_ENCRYPTION_KEY") ?? "").trim();

const AT_USERNAME = (Deno.env.get("AFRICAS_TALKING_USERNAME") ?? "").trim();
const AT_API_KEY = (Deno.env.get("AFRICAS_TALKING_API_KEY") ?? "").trim();

const OTP_EXPIRY_MINUTES = 5;
const PHONE_RATE_LIMIT = 3;

if (!SUPABASE_URL || !SERVICE_ROLE || !ENCRYPTION_KEY) {
  throw new Error("Missing required Supabase env variables.");
}

if (!AT_USERNAME || !AT_API_KEY) {
  throw new Error("Missing Africa's Talking credentials.");
}

/* ================= HELPERS ================= */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

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

  return "+" + normalized;
}

function base64ToBytes(base64: string) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

async function getKey() {
  const raw = base64ToBytes(ENCRYPTION_KEY);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
}

async function encryptPassword(password: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password),
  );

  return `${bytesToBase64(iv)}:${bytesToBase64(
    new Uint8Array(encryptedBuffer),
  )}`;
}

async function sha256(text: string) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text.trim()),
  );

  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSecureOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % 900000 + 100000).toString();
}

function validateFullName(value: unknown): string {
  const fullName = typeof value === "string" ? value.trim() : "";

  if (!fullName) {
    throw new Error("Full name is required");
  }

  if (fullName.length < 2) {
    throw new Error("Full name is too short");
  }

  if (fullName.length > 120) {
    throw new Error("Full name is too long");
  }

  return fullName;
}

function validateBusinessName(value: unknown, role: string): string | null {
  if (role !== "employer") {
    return null;
  }

  const businessName = typeof value === "string" ? value.trim() : "";

  if (!businessName) {
    return null;
  }

  if (businessName.length < 2) {
    throw new Error("Business name is too short");
  }

  if (businessName.length > 120) {
    throw new Error("Business name is too long");
  }

  return businessName;
}

/* ================= EDGE ================= */

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid request" }, 400);
    }

    const { phone, full_name, password, role, business_name } = body;

    if (!phone || !full_name || !password || !role) {
      return json({ error: "Invalid request" }, 400);
    }

    let normalized: string;
    let safeFullName: string;
    let safeBusinessName: string | null;

    try {
      normalized = normalizeUgPhone(String(phone));
      safeFullName = validateFullName(full_name);
      safeBusinessName = validateBusinessName(business_name, String(role));
    } catch (err) {
      return json(
        { error: err instanceof Error ? err.message : "Invalid request" },
        400,
      );
    }

    if (!["employer", "job_seeker"].includes(role)) {
      return json({ error: "Invalid role" }, 400);
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)
    ) {
      return json(
        { error: "Password must be at least 8 characters and include letters and numbers." },
        400,
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const windowStart = new Date(
      Date.now() - 15 * 60 * 1000,
    ).toISOString();

    const { count, error: rateError } = await admin
      .from("registration_otps")
      .select("id", { count: "exact", head: true })
      .eq("phone_number", normalized)
      .gt("created_at", windowStart);

    if (rateError) {
      console.error("OTP rate limit query error:", rateError);
      return json({ error: "Unable to process request" }, 500);
    }

    if ((count ?? 0) >= PHONE_RATE_LIMIT) {
      return json({ error: "Too many attempts. Please wait." }, 429);
    }

    const otp = generateSecureOTP();
    const otpHash = await sha256(otp);
    const encryptedPassword = await encryptPassword(password);

    const { error: invalidateError } = await admin
      .from("registration_otps")
      .update({ used_at: new Date().toISOString() })
      .eq("phone_number", normalized)
      .is("used_at", null);

    if (invalidateError) {
      console.error("OTP invalidate error:", invalidateError);
      return json({ error: "Unable to process request" }, 500);
    }

    const insertPayload: Record<string, unknown> = {
      phone_number: normalized,
      otp_hash: otpHash,
      encrypted_password: encryptedPassword,
      full_name: safeFullName,
      role,
      expires_at: new Date(
        Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
      ).toISOString(),
    };

    if (role === "employer") {
      insertPayload.business_name = safeBusinessName;
    }

    const { error: insertError } = await admin
      .from("registration_otps")
      .insert(insertPayload);

    if (insertError) {
      console.error("OTP insert error:", insertError);
      return json({ error: "Failed to generate OTP" }, 500);
    }

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
        message: `Your AwoJobs code is ${otp}. Expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      }),
    });

    const smsText = await smsResponse.text();

    if (!smsResponse.ok) {
      console.error("SMS failed:", smsText);
      return json({ error: "SMS delivery failed" }, 502);
    }

    console.log("SMS success:", smsText);

    return json({ success: true }, 200);
  } catch (err) {
    console.error("Edge error:", err);
    return json({ error: "Internal error" }, 500);
  }
});