import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ================= ENV ================= */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_KEY = (Deno.env.get("PASSWORD_ENCRYPTION_KEY") ?? "").trim();

const MAX_VERIFY_ATTEMPTS = 5;

if (!SUPABASE_URL || !SERVICE_ROLE || !ENCRYPTION_KEY) {
  throw new Error("Missing required environment variables.");
}

/* ================= SAFE JSON RESPONSE ================= */

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200, // ALWAYS 200
    headers: { "Content-Type": "application/json" },
  });
}

/* ================= HELPERS ================= */

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

function base64ToBytes(base64: string) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function sha256(text: string) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text.trim())
  );

  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function decryptPassword(payload: string): Promise<string> {
  const parts = payload.split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted payload");

  const [ivBase64, encryptedBase64] = parts;

  const raw = base64ToBytes(ENCRYPTION_KEY);

  const key = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivBase64) },
    key,
    base64ToBytes(encryptedBase64)
  );

  return new TextDecoder().decode(decrypted);
}

/* ================= EDGE ================= */

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" });
    }

    const body = await req.json().catch(() => null);
    if (!body?.phone || !body?.otp) {
      return json({ error: "Invalid request" });
    }

    const otpInput = String(body.otp).trim();
    if (!/^\d{6}$/.test(otpInput)) {
      return json({ error: "Invalid code" });
    }

    let normalized: string;
    try {
      normalized = normalizeUgPhone(body.phone);
    } catch {
      return json({ error: "Invalid phone format" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const nowIso = new Date().toISOString();
    const incomingHash = await sha256(otpInput);

    /* ================= ATOMIC OTP CLAIM ================= */

    const { data: claimed, error: claimError } = await admin
      .from("registration_otps")
      .update({ used_at: nowIso })
      .eq("phone_number", normalized)
      .eq("otp_hash", incomingHash)
      .is("used_at", null)
      .gt("expires_at", nowIso)
      .lt("attempts", MAX_VERIFY_ATTEMPTS)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (claimError || !claimed || claimed.length === 0) {
      return json({ error: "Invalid or expired code" });
    }

    const otpRow = claimed[0];

    /* ================= DECRYPT PASSWORD ================= */

    const realPassword = await decryptPassword(
      otpRow.encrypted_password
    );

    /* ================= CREATE USER (SYNTHETIC EMAIL) ================= */

    /**
 * ================================================
 * AUTH ARCHITECTURE NOTE (DO NOT MODIFY)
 * ================================================
 *
 * AwoJobs uses synthetic email authentication.
 *
 * Phone numbers are the canonical user identity,
 * but Supabase authentication is performed using
 * email/password internally to avoid dependency
 * on Supabase Phone provider and SMS configuration.
 *
 * Synthetic email format:
 *   <normalized_digits>@awojobs.app
 *
 * Example:
 *   +256703656305 → 256703656305@awojobs.app
 *
 * DO NOT switch back to phone-based login unless
 * the entire OTP + provider architecture is redesigned.
 * ================================================
 */

const syntheticEmail = `${normalized.replace(/^\+/, "")}@awojobs.app`;

const { data: createdUser, error: createError } =
  await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: realPassword,
    email_confirm: true,
    user_metadata: {
      phone_number: normalized,
      full_name: otpRow.full_name,
      business_name:
        otpRow.role === "employer" && typeof otpRow.business_name === "string"
          ? otpRow.business_name.trim() || null
          : null,
      role: otpRow.role ?? "job_seeker",
    },
  });

if (createError) {
  if (
    createError.message?.toLowerCase().includes("already") ||
    createError.message?.toLowerCase().includes("exists")
  ) {
    return json({ error: "Account already exists" });
  }

  console.error("CREATE USER ERROR:", createError);
  return json({ error: "Account creation failed" });
}

if (!createdUser?.user) {
  return json({ error: "Account creation failed" });
}

    /* ================= SUCCESS ================= */

    return json({ success: true });

  } catch (err) {
    console.error("Verify error:", err);
    return json({ error: "Internal error" });
  }
});