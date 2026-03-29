import { supabase } from "../core/supabase";
import { syncSessionFromSupabase } from "../state/useSession";

/* =====================================================
   CONFIG
===================================================== */

const REQUEST_TIMEOUT_MS = 10000;
const SYNTHETIC_EMAIL_DOMAIN = "awojobs.app";

export type UserRole =
  | "job_seeker"
  | "employer"
  | "moderator"
  | "super_admin";

export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export type AppError = {
  code: AppErrorCode;
  message: string;
  retryable: boolean;
  fieldErrors?: Record<string, string>;
};

export type AppResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

type FunctionErrorPayload = {
  code?: unknown;
  message?: unknown;
  retryable?: unknown;
  fieldErrors?: unknown;
  error?: unknown;
  action?: unknown;
};

type DeleteAccountAction = "deleted" | "closed";

type DeleteAccountResult = {
  success: true;
  action: DeleteAccountAction;
};

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

function makeError(
  code: AppErrorCode,
  message: string,
  retryable: boolean,
  fieldErrors?: Record<string, string>,
): AppError {
  return { code, message, retryable, fieldErrors };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseFieldErrors(value: unknown): Record<string, string> | undefined {
  const obj = asObject(value);
  if (!obj) return undefined;

  const entries = Object.entries(obj).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  ) as [string, string][];

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function mapStructuredErrorPayload(
  payload: unknown,
): AppError | null {
  const obj = asObject(payload);
  if (!obj) return null;

  const code = typeof obj.code === "string" ? obj.code : null;
  const message = typeof obj.message === "string" ? obj.message : null;
  const retryable = typeof obj.retryable === "boolean" ? obj.retryable : false;
  const fieldErrors = parseFieldErrors(obj.fieldErrors);

  if (!code || !message) return null;

  switch (code) {
    case "AUTH_REQUIRED":
      return makeError("AUTH_REQUIRED", "Please sign in again.", retryable, fieldErrors);
    case "SESSION_EXPIRED":
      return makeError(
        "SESSION_EXPIRED",
        "Your session has ended. Please sign in again.",
        retryable,
        fieldErrors,
      );
    case "FORBIDDEN":
      return makeError("FORBIDDEN", message, retryable, fieldErrors);
    case "NOT_FOUND":
      return makeError("NOT_FOUND", message, retryable, fieldErrors);
    case "VALIDATION_ERROR":
      return makeError("VALIDATION_ERROR", message, retryable, fieldErrors);
    case "RATE_LIMITED":
    case "RATE_LIMIT_DEVICE":
    case "RATE_LIMIT_IP":
      return makeError(
        "RATE_LIMITED",
        "Please wait a moment before trying again.",
        true,
        fieldErrors,
      );
    default:
      return makeError("UNKNOWN_ERROR", message, retryable, fieldErrors);
  }
}

function mapLegacyInvokeError(errorText: string, fallback: string): AppError {
  const normalized = errorText.trim().toLowerCase();

  if (
    normalized.includes("network request failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network error") ||
    normalized.includes("network_timeout") ||
    normalized.includes("request timed out") ||
    normalized.includes("timed out")
  ) {
    return makeError(
      "NETWORK_ERROR",
      "No internet connection. Please check your network and try again.",
      true,
    );
  }

  if (
    normalized.includes("too many requests") ||
    normalized.includes("rate limit") ||
    normalized.includes("wait before retrying") ||
    normalized.includes("retry later") ||
    normalized.includes("cooldown")
  ) {
    return makeError(
      "RATE_LIMITED",
      "Please wait a moment before trying again.",
      true,
    );
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("invalid phone or password") ||
    normalized.includes("unauthorized") ||
    normalized.includes("401")
  ) {
    return makeError(
      "FORBIDDEN",
      "Invalid phone or password.",
      false,
    );
  }

  if (normalized.includes("invalid uganda phone number")) {
    return makeError(
      "VALIDATION_ERROR",
      "Invalid Uganda phone number.",
      false,
      { phone: "Invalid Uganda phone number." },
    );
  }

  if (normalized.includes("full name is required")) {
    return makeError(
      "VALIDATION_ERROR",
      "Full name is required.",
      false,
      { full_name: "Full name is required." },
    );
  }

  if (normalized.includes("invalid role")) {
    return makeError(
      "VALIDATION_ERROR",
      "Invalid role.",
      false,
      { role: "Invalid role." },
    );
  }

  if (
    normalized.includes("business name is too long") ||
    normalized.includes("enter at least 2 characters")
  ) {
    return makeError(
      "VALIDATION_ERROR",
      fallback,
      false,
      { business_name: fallback },
    );
  }

  if (
    normalized.includes("password must be at least 8 characters") ||
    normalized.includes("include letters and numbers")
  ) {
    return makeError(
      "VALIDATION_ERROR",
      "Password must be at least 8 characters and include letters and numbers.",
      false,
      {
        password:
          "Password must be at least 8 characters and include letters and numbers.",
      },
    );
  }

  if (normalized.includes("invalid verification code")) {
    return makeError(
      "VALIDATION_ERROR",
      "Invalid verification code.",
      false,
      { otp: "Invalid verification code." },
    );
  }

  if (
    normalized.includes("reauth") ||
    normalized.includes("re-auth") ||
    normalized.includes("recent login")
  ) {
    return makeError(
      "FORBIDDEN",
      "Please confirm your password and try again.",
      false,
    );
  }

  if (normalized.includes("role_not_deletable")) {
    return makeError(
      "FORBIDDEN",
      "This account cannot be deleted from the app.",
      false,
    );
  }

  if (normalized.includes("employer_must_close_account")) {
    return makeError(
      "FORBIDDEN",
      "Employer accounts cannot be permanently deleted here. Close the account instead.",
      false,
    );
  }

  if (
    normalized.includes("applications exist") ||
    normalized.includes("close or expire the job instead") ||
    normalized.includes("job_delete_blocked_by_applications")
  ) {
    return makeError(
      "FORBIDDEN",
      "This employer account cannot be deleted because some jobs already have applications.",
      false,
    );
  }

  return makeError("UNKNOWN_ERROR", fallback, false);
}

function normalizeUnknownError(err: unknown, fallback: string): AppError {
  const structured = mapStructuredErrorPayload(err);
  if (structured) return structured;

  const message = toMessage(err).trim();
  if (message) {
    return mapLegacyInvokeError(message, fallback);
  }

  return makeError("UNKNOWN_ERROR", fallback, false);
}

async function syncSessionSafely(): Promise<void> {
  try {
    await syncSessionFromSupabase();
  } catch {
    // session sync should not hide a successful auth action result
  }
}

async function checkedSignOut(
  fallback = "Unable to logout.",
): Promise<AppResult<true>> {
  try {
    const { error } = await withTimeout(supabase.auth.signOut());

    if (error) {
      return {
        ok: false,
        error: normalizeUnknownError(error, fallback),
      };
    }

    await syncSessionSafely();

    return { ok: true, data: true };
  } catch (err) {
    return {
      ok: false,
      error: normalizeUnknownError(err, fallback),
    };
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

  throw makeError(
    "VALIDATION_ERROR",
    "Invalid Uganda phone number.",
    false,
    { phone: "Invalid Uganda phone number." },
  );
}

/* =====================================================
   PASSWORD VALIDATION
===================================================== */

function validatePassword(password: string) {
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
    throw makeError(
      "VALIDATION_ERROR",
      "Password must be at least 8 characters and include letters and numbers.",
      false,
      {
        password:
          "Password must be at least 8 characters and include letters and numbers.",
      },
    );
  }
}

/* =====================================================
   EDGE/FUNCTION RESPONSE NORMALIZATION
===================================================== */

function extractLegacyInvokeError(
  data: unknown,
  fallback: string,
): AppError | null {
  const obj = asObject(data);
  if (!obj) return null;

  const maybeError =
    typeof obj.error === "string" && obj.error.trim().length > 0
      ? obj.error
      : null;

  if (!maybeError) return null;
  return mapLegacyInvokeError(maybeError, fallback);
}

async function invokeFunction<TData = unknown>(
  name: string,
  body: unknown,
  fallback: string,
): Promise<AppResult<TData>> {
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke(name, { body }),
    );

    if (error) {
      return {
        ok: false,
        error: normalizeUnknownError(error, fallback),
      };
    }

    const structured = mapStructuredErrorPayload(data);
    if (structured) {
      return { ok: false, error: structured };
    }

    const legacyError = extractLegacyInvokeError(data, fallback);
    if (legacyError) {
      return { ok: false, error: legacyError };
    }

    return { ok: true, data: data as TData };
  } catch (err) {
    return {
      ok: false,
      error: normalizeUnknownError(err, fallback),
    };
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
  business_name?: string;
}): Promise<AppResult<{ success: true }>> {
  try {
    const phone = normalizeUgPhone(params.phone);

    const fullName = params.full_name?.trim();
    if (!fullName || fullName.length < 2) {
      return {
        ok: false,
        error: makeError(
          "VALIDATION_ERROR",
          "Full name is required.",
          false,
          { full_name: "Full name is required." },
        ),
      };
    }

    if (!["employer", "job_seeker"].includes(params.role)) {
      return {
        ok: false,
        error: makeError(
          "VALIDATION_ERROR",
          "Invalid role.",
          false,
          { role: "Invalid role." },
        ),
      };
    }

    const businessName =
      params.role === "employer" && typeof params.business_name === "string"
        ? params.business_name.trim()
        : "";

    if (businessName && businessName.length < 2) {
      return {
        ok: false,
        error: makeError(
          "VALIDATION_ERROR",
          "Enter at least 2 characters.",
          false,
          { business_name: "Enter at least 2 characters." },
        ),
      };
    }

    if (businessName.length > 120) {
      return {
        ok: false,
        error: makeError(
          "VALIDATION_ERROR",
          "Business name is too long.",
          false,
          { business_name: "Business name is too long." },
        ),
      };
    }

    validatePassword(params.password);

    const result = await invokeFunction(
      "request_registration_otp",
      {
        phone,
        full_name: fullName,
        role: params.role,
        password: params.password,
        business_name: businessName || undefined,
      },
      "Failed to send verification code.",
    );

    if (!result.ok) return result;

    return { ok: true, data: { success: true } };
  } catch (err) {
    return {
      ok: false,
      error: normalizeUnknownError(err, "Failed to send verification code."),
    };
  }
}

/* =====================================================
   STEP 2: VERIFY OTP + AUTO LOGIN
===================================================== */

export async function verifyRegistrationOtp(params: {
  phone: string;
  otp: string;
  password: string;
}): Promise<AppResult<{ userId: string }>> {
  try {
    const phone = normalizeUgPhone(params.phone);

    if (!/^\d{6}$/.test(params.otp)) {
      return {
        ok: false,
        error: makeError(
          "VALIDATION_ERROR",
          "Invalid verification code.",
          false,
          { otp: "Invalid verification code." },
        ),
      };
    }

    const verifyResult = await invokeFunction(
      "verify_registration_otp",
      { phone, otp: params.otp },
      "Verification failed.",
    );

    if (!verifyResult.ok) return verifyResult;

    const syntheticEmail = createSyntheticEmail(phone);

    const { data: loginData, error: loginError } =
      await withTimeout(
        supabase.auth.signInWithPassword({
          email: syntheticEmail,
          password: params.password,
        }),
      );

    if (loginError) {
      return {
        ok: false,
        error: normalizeUnknownError(loginError, "Unable to sign in."),
      };
    }

    if (!loginData?.user || !loginData.session) {
      return {
        ok: false,
        error: makeError(
          "UNKNOWN_ERROR",
          "Unable to sign in.",
          false,
        ),
      };
    }

    await syncSessionSafely();

    return {
      ok: true,
      data: { userId: loginData.user.id },
    };
  } catch (err) {
    return {
      ok: false,
      error: normalizeUnknownError(err, "Verification failed."),
    };
  }
}

/* =====================================================
   RESEND OTP
===================================================== */

export async function resendRegistrationOtp(params: {
  phone: string;
}): Promise<AppResult<{ success: true }>> {
  try {
    const phone = normalizeUgPhone(params.phone);

    const result = await invokeFunction(
      "resend_registration_otp",
      { phone },
      "Unable to resend code.",
    );

    if (!result.ok) return result;
    return { ok: true, data: { success: true } };
  } catch (err) {
    return {
      ok: false,
      error: normalizeUnknownError(err, "Unable to resend code."),
    };
  }
}

/* =====================================================
   LOGIN (SYNTHETIC EMAIL AUTH)
===================================================== */

export async function login(params: {
  phone: string;
  password: string;
}): Promise<AppResult<{ userId: string }>> {
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
      return {
        ok: false,
        error: normalizeUnknownError(error, "Unable to sign in right now."),
      };
    }

    if (!data?.user || !data.session) {
      return {
        ok: false,
        error: makeError(
          "UNKNOWN_ERROR",
          "Unable to sign in right now.",
          false,
        ),
      };
    }

    await syncSessionSafely();

    return {
      ok: true,
      data: { userId: data.user.id },
    };
  } catch (err) {
    return {
      ok: false,
      error: normalizeUnknownError(err, "Unable to sign in right now."),
    };
  }
}

/* =====================================================
   RE-AUTH FOR SENSITIVE ACTIONS
===================================================== */

export async function reauthenticateForSensitiveAction(params: {
  phone: string;
  password: string;
}): Promise<AppResult<{ success: true }>> {
  try {
    const phone = normalizeUgPhone(params.phone);
    validatePassword(params.password);

    const syntheticEmail = createSyntheticEmail(phone);

    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: params.password,
      }),
    );

    if (error) {
      return {
        ok: false,
        error: normalizeUnknownError(error, "Re-authentication failed."),
      };
    }

    if (!data?.session) {
      return {
        ok: false,
        error: makeError(
          "UNKNOWN_ERROR",
          "Re-authentication failed.",
          false,
        ),
      };
    }

    await syncSessionSafely();

    return { ok: true, data: { success: true } };
  } catch (err) {
    return {
      ok: false,
      error: normalizeUnknownError(err, "Re-authentication failed."),
    };
  }
}

/* =====================================================
   PASSWORD RESET REQUEST
===================================================== */

export async function requestPasswordReset(params: {
  phone: string;
}): Promise<AppResult<{ success: true }>> {
  try {
    const phone = normalizeUgPhone(params.phone);

    const result = await invokeFunction(
      "request_password_reset",
      { phone },
      "Unable to process request.",
    );

    if (!result.ok) return result;
    return { ok: true, data: { success: true } };
  } catch (err) {
    return {
      ok: false,
      error: normalizeUnknownError(err, "Unable to process request."),
    };
  }
}

/* =====================================================
   PASSWORD RESET CONFIRM
===================================================== */

export async function confirmPasswordReset(params: {
  phone: string;
  token: string;
  newPassword: string;
}): Promise<AppResult<{ success: true }>> {
  try {
    const phone = normalizeUgPhone(params.phone);

    if (!/^\d{6}$/.test(params.token)) {
      return {
        ok: false,
        error: makeError(
          "VALIDATION_ERROR",
          "Invalid verification code.",
          false,
          { token: "Invalid verification code." },
        ),
      };
    }

    validatePassword(params.newPassword);

    const result = await invokeFunction(
      "confirm_password_reset",
      {
        phone,
        token: params.token,
        new_password: params.newPassword,
      },
      "Reset failed.",
    );

    if (!result.ok) return result;
    return { ok: true, data: { success: true } };
  } catch (err) {
    return {
      ok: false,
      error: normalizeUnknownError(err, "Reset failed."),
    };
  }
}

/* =====================================================
   LOGOUT
===================================================== */

export async function logout(): Promise<AppResult<{ success: true }>> {
  const result = await checkedSignOut("Unable to logout.");
  if (!result.ok) return result;
  return { ok: true, data: { success: true } };
}

/* =====================================================
   ACCOUNT ACTIONS
===================================================== */

async function invokeDeleteAccount(): Promise<AppResult<DeleteAccountResult>> {
  const result = await invokeFunction<FunctionErrorPayload>(
    "delete_account",
    undefined,
    "Unable to complete account action.",
  );

  if (!result.ok) return result;

  const data = asObject(result.data);
  const action =
    data?.action === "deleted" || data?.action === "closed"
      ? (data.action as DeleteAccountAction)
      : null;

  if (!action) {
    return {
      ok: false,
      error: makeError(
        "UNKNOWN_ERROR",
        "Invalid account action response.",
        false,
      ),
    };
  }

  return {
    ok: true,
    data: {
      success: true,
      action,
    },
  };
}

export async function deleteJobSeekerAccount(): Promise<
  AppResult<DeleteAccountResult>
> {
  const result = await invokeDeleteAccount();
  if (!result.ok) return result;

  if (result.data.action !== "deleted") {
    return {
      ok: false,
      error: makeError(
        "UNKNOWN_ERROR",
        "Unable to delete account.",
        false,
      ),
    };
  }

  const signOutResult = await checkedSignOut("Unable to logout.");
  if (!signOutResult.ok) return signOutResult;

  return result;
}

export async function closeEmployerAccount(): Promise<
  AppResult<DeleteAccountResult>
> {
  const result = await invokeDeleteAccount();
  if (!result.ok) return result;

  if (result.data.action !== "closed") {
    return {
      ok: false,
      error: makeError(
        "UNKNOWN_ERROR",
        "Unable to close account.",
        false,
      ),
    };
  }

  const signOutResult = await checkedSignOut("Unable to logout.");
  if (!signOutResult.ok) return signOutResult;

  return result;
}

export async function deleteOrCloseAccountByRole(
  role: UserRole,
): Promise<AppResult<DeleteAccountResult>> {
  if (role === "job_seeker") {
    return deleteJobSeekerAccount();
  }

  if (role === "employer") {
    return closeEmployerAccount();
  }

  return {
    ok: false,
    error: makeError(
      "FORBIDDEN",
      "This account cannot be deleted from the app.",
      false,
    ),
  };
}