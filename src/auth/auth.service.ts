import { supabase } from "../core/supabase";
import { syncSessionFromSupabase } from "../state/useSession";

/* =====================================================
   CONFIG
===================================================== */

const REQUEST_TIMEOUT_MS = 10000;
const SYNTHETIC_EMAIL_DOMAIN = "awojobs.app";

/* =====================================================
   TIMEOUT
===================================================== */

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error("NETWORK_TIMEOUT"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

/* =====================================================
   HELPERS
===================================================== */

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? "");
}

function normalizeMessage(err: unknown): string {
  return toMessage(err).trim().toLowerCase();
}

function createSyntheticEmail(phone: string): string {
  return `${phone.replace(/^\+/, "")}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

function extractInvokeError(data: unknown, fallback: string): string | null {
  if (!data || typeof data !== "object") return null;

  const maybeError =
    "error" in data && typeof (data as { error?: unknown }).error === "string"
      ? (data as { error: string }).error
      : null;

  if (!maybeError) return null;
  return maybeError || fallback;
}

function classifyAuthError(err: unknown, fallback: string): Error {
  const normalized = normalizeMessage(err);

  if (
    normalized.includes("network request failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network error") ||
    normalized.includes("network_timeout") ||
    normalized.includes("request timed out") ||
    normalized.includes("timed out")
  ) {
    return new Error(
      "No internet connection. Please check your network and try again.",
    );
  }

  if (
    normalized.includes("too many requests") ||
    normalized.includes("rate limit") ||
    normalized.includes("wait before retrying") ||
    normalized.includes("retry later") ||
    normalized.includes("cooldown")
  ) {
    return new Error("Please wait a moment before trying again.");
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("invalid phone or password") ||
    normalized.includes("unauthorized") ||
    normalized.includes("401")
  ) {
    return new Error("Invalid phone or password.");
  }

  if (normalized.includes("invalid uganda phone number")) {
    return new Error("Invalid Uganda phone number.");
  }

  if (normalized.includes("full name is required")) {
    return new Error("Full name is required.");
  }

  if (normalized.includes("invalid role")) {
    return new Error("Invalid role.");
  }

  if (
    normalized.includes("password must be at least 8 characters") ||
    normalized.includes("include letters and numbers")
  ) {
    return new Error(
      "Password must be at least 8 characters and include letters and numbers.",
    );
  }

  if (normalized.includes("invalid verification code")) {
    return new Error("Invalid verification code.");
  }

  if (
    normalized.includes("verification failed") ||
    normalized.includes("failed to send verification code") ||
    normalized.includes("unable to resend code") ||
    normalized.includes("unable to delete account") ||
    normalized.includes("unable to logout") ||
    normalized.includes("unable to process request") ||
    normalized.includes("reset failed")
  ) {
    return new Error(fallback);
  }

  return new Error(fallback);
}

async function syncSessionSafely() {
  try {
    await syncSessionFromSupabase();
  } catch {
    // Keep auth result successful even if sync refresh fails.
  }
}

/* =====================================================
   PHONE NORMALIZATION (UGANDA STRICT)
===================================================== */

function normalizeUgPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("256") && cleaned.length === 12) {
    return cleaned;
  }

  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return `256${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith("7") && cleaned.length === 9) {
    return `256${cleaned}`;
  }

  throw new Error("Invalid Uganda phone number.");
}

/* =====================================================
   PASSWORD VALIDATION
===================================================== */

function validatePassword(password: string) {
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
    throw new Error(
      "Password must be at least 8 characters and include letters and numbers.",
    );
  }
}

/* =====================================================
   STEP 1: REQUEST OTP
===================================================== */

export async function requestRegistrationOtp(params: {
  phone: string;
  full_name: string;
  role: "employer" | "job_seeker";
  password: string;
}) {
  try {
    const phone = normalizeUgPhone(params.phone);

    const fullName = params.full_name?.trim();
    if (!fullName || fullName.length < 2) {
      throw new Error("Full name is required.");
    }

    if (!["employer", "job_seeker"].includes(params.role)) {
      throw new Error("Invalid role.");
    }

    validatePassword(params.password);

    const { data, error } = await withTimeout(
      supabase.functions.invoke("request_registration_otp", {
        body: {
          phone,
          full_name: fullName,
          role: params.role,
          password: params.password,
        },
      }),
    );

    if (error) {
      throw new Error(error.message || "Failed to send verification code.");
    }

    const invokeError = extractInvokeError(
      data,
      "Failed to send verification code.",
    );
    if (invokeError) {
      throw new Error(invokeError);
    }

    return { success: true };
  } catch (err) {
    throw classifyAuthError(err, "Failed to send verification code.");
  }
}

/* =====================================================
   STEP 2: VERIFY OTP + AUTO LOGIN
===================================================== */

export async function verifyRegistrationOtp(params: {
  phone: string;
  otp: string;
  password: string;
}) {
  try {
    const phone = normalizeUgPhone(params.phone);

    if (!/^\d{6}$/.test(params.otp)) {
      throw new Error("Invalid verification code.");
    }

    const { data, error } = await withTimeout(
      supabase.functions.invoke("verify_registration_otp", {
        body: {
          phone,
          otp: params.otp,
        },
      }),
    );

    if (error) {
      throw new Error(error.message || "Verification failed.");
    }

    const invokeError = extractInvokeError(data, "Verification failed.");
    if (invokeError) {
      throw new Error(invokeError);
    }

    const syntheticEmail = createSyntheticEmail(phone);

    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: params.password,
      });

    if (loginError) {
      throw new Error(loginError.message || "Unable to sign in.");
    }

    if (!loginData?.session) {
      throw new Error("No session returned after verification.");
    }

    await syncSessionSafely();

    return loginData.user;
  } catch (err) {
    throw classifyAuthError(err, "Verification failed.");
  }
}

/* =====================================================
   RESEND OTP
===================================================== */

export async function resendRegistrationOtp(params: { phone: string }) {
  try {
    const phone = normalizeUgPhone(params.phone);

    const { data, error } = await withTimeout(
      supabase.functions.invoke("resend_registration_otp", {
        body: { phone },
      }),
    );

    if (error) {
      throw new Error(error.message || "Unable to resend code.");
    }

    const invokeError = extractInvokeError(data, "Unable to resend code.");
    if (invokeError) {
      throw new Error(invokeError);
    }

    return { success: true };
  } catch (err) {
    throw classifyAuthError(err, "Unable to resend code.");
  }
}

/* =====================================================
   LOGIN (SYNTHETIC EMAIL AUTH)
===================================================== */

export async function login(params: { phone: string; password: string }) {
  try {
    const phone = normalizeUgPhone(params.phone);
    const syntheticEmail = createSyntheticEmail(phone);

    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: params.password,
      }),
    );

    if (error) {
      throw new Error(error.message || "Unable to sign in right now.");
    }

    if (!data?.user || !data.session) {
      throw new Error("No user returned from sign in.");
    }

    await syncSessionSafely();

    return data;
  } catch (err) {
    throw classifyAuthError(err, "Unable to sign in right now.");
  }
}

/* =====================================================
   PASSWORD RESET REQUEST
===================================================== */

export async function requestPasswordReset(params: { phone: string }) {
  try {
    const phone = normalizeUgPhone(params.phone);

    const { data, error } = await withTimeout(
      supabase.functions.invoke("request_password_reset", {
        body: { phone },
      }),
    );

    if (error) {
      throw new Error(error.message || "Unable to process request.");
    }

    const invokeError = extractInvokeError(data, "Unable to process request.");
    if (invokeError) {
      throw new Error(invokeError);
    }

    return { success: true };
  } catch (err) {
    throw classifyAuthError(err, "Unable to process request.");
  }
}

/* =====================================================
   PASSWORD RESET CONFIRM
===================================================== */

export async function confirmPasswordReset(params: {
  phone: string;
  token: string;
  newPassword: string;
}) {
  try {
    const phone = normalizeUgPhone(params.phone);

    if (!/^\d{6}$/.test(params.token)) {
      throw new Error("Invalid verification code.");
    }

    validatePassword(params.newPassword);

    const { data, error } = await withTimeout(
      supabase.functions.invoke("confirm_password_reset", {
        body: {
          phone,
          token: params.token,
          new_password: params.newPassword,
        },
      }),
    );

    if (error) {
      throw new Error(error.message || "Reset failed.");
    }

    const invokeError = extractInvokeError(data, "Reset failed.");
    if (invokeError) {
      throw new Error(invokeError);
    }

    return { success: true };
  } catch (err) {
    throw classifyAuthError(err, "Reset failed.");
  }
}

/* =====================================================
   LOGOUT
===================================================== */

export async function logout() {
  try {
    const { error } = await withTimeout(supabase.auth.signOut());

    if (error) {
      throw new Error(error.message || "Unable to logout.");
    }

    await syncSessionSafely();
  } catch (err) {
    throw classifyAuthError(err, "Unable to logout.");
  }
}

/* =====================================================
   DELETE ACCOUNT
===================================================== */

export async function deleteAccount() {
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke("delete_account", {
        method: "POST",
      }),
    );

    if (error) {
      throw new Error(error.message || "Unable to delete account.");
    }

    const invokeError = extractInvokeError(data, "Unable to delete account.");
    if (invokeError) {
      throw new Error(invokeError);
    }

    await supabase.auth.signOut();
    await syncSessionSafely();
  } catch (err) {
    throw classifyAuthError(err, "Unable to delete account.");
  }
}