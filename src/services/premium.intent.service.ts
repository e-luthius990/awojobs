import { supabase } from "../core/supabase";

export type PremiumPurpose = "premium_1_day" | "premium_7_days" | "premium_30_days";
export type UserRole = "job_seeker" | "employer" | "moderator" | "super_admin" | null;

export type PremiumRecord = {
  expires_at: string | null;
  status: string | null;
} | null;

export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
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

export type PremiumIntentSuccess = {
  intentId: string | null;
  paymentReference: string | null;
};

export type PremiumStatusData = {
  role: UserRole;
  premiumRecord: PremiumRecord;
};

type CreateIntentPayload = {
  intent_id?: string | null;
  payment_reference?: string | null;
  code?: string;
  message?: string;
  retryable?: boolean;
  fieldErrors?: Record<string, string>;
  error?: string | null;
};

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

function parseStructuredPayload(payload: unknown): AppError | null {
  const obj = asObject(payload);
  if (!obj) return null;

  const code = typeof obj.code === "string" ? obj.code : null;
  const message = typeof obj.message === "string" ? obj.message : null;
  const retryable = typeof obj.retryable === "boolean" ? obj.retryable : false;
  const fieldErrors =
    obj.fieldErrors && typeof obj.fieldErrors === "object" && !Array.isArray(obj.fieldErrors)
      ? (obj.fieldErrors as Record<string, string>)
      : undefined;

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
    default:
      return makeError("UNKNOWN_ERROR", message, retryable, fieldErrors);
  }
}

function mapLegacyErrorText(errorText: string, fallback: string): AppError {
  const normalized = errorText.trim().toLowerCase();

  if (
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("timed out")
  ) {
    return makeError(
      "NETWORK_ERROR",
      "Network issue. Please check your connection and try again.",
      true,
    );
  }

  if (
    normalized.includes("auth_required") ||
    normalized.includes("unauthorized")
  ) {
    return makeError("AUTH_REQUIRED", "Please sign in again.", false);
  }

  if (
    normalized.includes("session_expired") ||
    normalized.includes("jwt") ||
    normalized.includes("refresh token")
  ) {
    return makeError(
      "SESSION_EXPIRED",
      "Your session has ended. Please sign in again.",
      false,
    );
  }

  if (
    normalized.includes("suspended") ||
    normalized.includes("job seekers only") ||
    normalized.includes("forbidden")
  ) {
    return makeError("FORBIDDEN", fallback, false);
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("missing")
  ) {
    return makeError("VALIDATION_ERROR", fallback, false);
  }

  return makeError("UNKNOWN_ERROR", fallback, false);
}

function normalizeUnknownError(error: unknown, fallback: string): AppError {
  const structured = parseStructuredPayload(error);
  if (structured) return structured;

  if (error instanceof Error && error.message) {
    return mapLegacyErrorText(error.message, fallback);
  }

  return makeError("UNKNOWN_ERROR", fallback, false);
}

export async function fetchPremiumStatus(
  userId: string | null,
): Promise<AppResult<PremiumStatusData>> {
  if (!userId) {
    return {
      ok: true,
      data: {
        role: null,
        premiumRecord: null,
      },
    };
  }

  try {
    const [
      { data: profile, error: profileError },
      { data: premium, error: premiumError },
    ] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
      supabase
        .from("job_seeker_premium")
        .select("expires_at, status")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (profileError || premiumError) {
      throw profileError ?? premiumError;
    }

    return {
      ok: true,
      data: {
        role: (profile?.role as UserRole) ?? null,
        premiumRecord: (premium as PremiumRecord) ?? null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: normalizeUnknownError(
        error,
        "We could not load your premium status right now.",
      ),
    };
  }
}

export async function createPremiumIntent(
  purpose: PremiumPurpose,
): Promise<AppResult<PremiumIntentSuccess>> {
  try {
    const { data, error } = await supabase.functions.invoke("create_premium_intent", {
      body: { purpose },
    });

    if (error) {
      return {
        ok: false,
        error: normalizeUnknownError(
          error,
          "Premium payment session could not be created.",
        ),
      };
    }

    const structured = parseStructuredPayload(data);
    if (structured) {
      return { ok: false, error: structured };
    }

    const payload = (data ?? {}) as CreateIntentPayload;

    if (typeof payload.error === "string" && payload.error.trim()) {
      return {
        ok: false,
        error: mapLegacyErrorText(
          payload.error,
          "Premium payment session could not be created.",
        ),
      };
    }

    const intentId =
      typeof payload.intent_id === "string" ? payload.intent_id : null;
    const paymentReference =
      typeof payload.payment_reference === "string"
        ? payload.payment_reference
        : null;

    if (!intentId && !paymentReference) {
      return {
        ok: false,
        error: makeError(
          "UNKNOWN_ERROR",
          "Premium payment session could not be created.",
          false,
        ),
      };
    }

    return {
      ok: true,
      data: {
        intentId,
        paymentReference,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: normalizeUnknownError(
        error,
        "Premium payment session could not be created.",
      ),
    };
  }
}