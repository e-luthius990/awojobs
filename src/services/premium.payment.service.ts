import { Linking } from "react-native";
import { supabase } from "../core/supabase";

export type PremiumPurpose = "premium_1_day" | "premium_7_days" | "premium_30_days";

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

export type StartPremiumPaymentInput = {
  purpose: PremiumPurpose;
  intentId?: string | null;
  paymentReference?: string | null;
};

export type StartPremiumPaymentSuccess = {
  url: string;
  paymentReference: string | null;
  intentId: string | null;
  status: string | null;
  message: string | null;
};

export type PremiumStatusInput = {
  intentId?: string | null;
  paymentReference?: string | null;
};

export type PremiumStatusSuccess = {
  status: "confirmed" | "pending" | "failed" | "cancelled" | "expired" | "unknown";
  active: boolean;
  message: string | null;
};

type FunctionErrorPayload = {
  code?: unknown;
  message?: unknown;
  retryable?: unknown;
  fieldErrors?: unknown;
  error?: unknown;
  status?: unknown;
  active?: unknown;
  payment_url?: unknown;
  checkout_url?: unknown;
  payment_reference?: unknown;
  intent_id?: unknown;
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

function parseFieldErrors(value: unknown): Record<string, string> | undefined {
  const obj = asObject(value);
  if (!obj) return undefined;

  const entries = Object.entries(obj).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  ) as [string, string][];

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function mapStructuredPayload(payload: unknown): AppError | null {
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
    normalized.includes("unauthorized") ||
    normalized.includes("auth_required")
  ) {
    return makeError(
      "AUTH_REQUIRED",
      "Please sign in again.",
      false,
    );
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
    normalized.includes("forbidden") ||
    normalized.includes("suspended") ||
    normalized.includes("job seekers only")
  ) {
    return makeError(
      "FORBIDDEN",
      fallback,
      false,
    );
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("missing")
  ) {
    return makeError(
      "VALIDATION_ERROR",
      fallback,
      false,
    );
  }

  return makeError("UNKNOWN_ERROR", fallback, false);
}

function normalizeInvokeFailure(
  error: unknown,
  fallback: string,
): AppError {
  const structured = mapStructuredPayload(error);
  if (structured) return structured;

  if (error instanceof Error && error.message) {
    return mapLegacyErrorText(error.message, fallback);
  }

  return makeError("UNKNOWN_ERROR", fallback, false);
}

async function invokeFunction<TData>(
  name: string,
  body: unknown,
  fallback: string,
): Promise<AppResult<TData>> {
  try {
    const { data, error } = await supabase.functions.invoke(name, { body });

    if (error) {
      return {
        ok: false,
        error: normalizeInvokeFailure(error, fallback),
      };
    }

    const structured = mapStructuredPayload(data);
    if (structured) {
      return { ok: false, error: structured };
    }

    const obj = asObject(data);
    if (obj && typeof obj.error === "string" && obj.error.trim().length > 0) {
      return {
        ok: false,
        error: mapLegacyErrorText(obj.error, fallback),
      };
    }

    return { ok: true, data: data as TData };
  } catch (err) {
    return {
      ok: false,
      error: normalizeInvokeFailure(err, fallback),
    };
  }
}

export async function startPremiumPayment(
  input: StartPremiumPaymentInput,
): Promise<AppResult<StartPremiumPaymentSuccess>> {
  const result = await invokeFunction<FunctionErrorPayload>(
    "start_premium_payment",
    {
      purpose: input.purpose,
      intent_id: input.intentId ?? null,
      payment_reference: input.paymentReference ?? null,
    },
    "Unable to continue to payment.",
  );

  if (!result.ok) return result;

  const payload = asObject(result.data);

  const paymentUrl =
    payload && typeof payload.payment_url === "string" && payload.payment_url.trim()
      ? payload.payment_url
      : null;

  const checkoutUrl =
    payload && typeof payload.checkout_url === "string" && payload.checkout_url.trim()
      ? payload.checkout_url
      : null;

  const url = paymentUrl ?? checkoutUrl;

  if (!url) {
    return {
      ok: false,
      error: makeError(
        "UNKNOWN_ERROR",
        "Payment link could not be created.",
        false,
      ),
    };
  }

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    return {
      ok: false,
      error: makeError(
        "UNKNOWN_ERROR",
        "Payment link could not be opened on this device.",
        false,
      ),
    };
  }

  return {
    ok: true,
    data: {
      url,
      paymentReference:
        payload && typeof payload.payment_reference === "string"
          ? payload.payment_reference
          : null,
      intentId:
        payload && typeof payload.intent_id === "string"
          ? payload.intent_id
          : null,
      status:
        payload && typeof payload.status === "string"
          ? payload.status
          : null,
      message:
        payload && typeof payload.message === "string"
          ? payload.message
          : null,
    },
  };
}

export async function openPremiumPaymentUrl(
  input: StartPremiumPaymentInput,
): Promise<AppResult<StartPremiumPaymentSuccess>> {
  const result = await startPremiumPayment(input);
  if (!result.ok) return result;

  try {
    await Linking.openURL(result.data.url);
    return result;
  } catch {
    return {
      ok: false,
      error: makeError(
        "UNKNOWN_ERROR",
        "Payment link could not be opened on this device.",
        false,
      ),
    };
  }
}

export async function checkPremiumPaymentStatus(
  input: PremiumStatusInput,
): Promise<AppResult<PremiumStatusSuccess>> {
  const result = await invokeFunction<FunctionErrorPayload>(
    "check_premium_status",
    {
      intent_id: input.intentId ?? null,
      payment_reference: input.paymentReference ?? null,
    },
    "Unable to check payment status.",
  );

  if (!result.ok) return result;

  const payload = asObject(result.data);

  const rawStatus =
    payload && typeof payload.status === "string"
      ? payload.status.toLowerCase()
      : null;

  const status: PremiumStatusSuccess["status"] =
    rawStatus === "confirmed" ||
    rawStatus === "pending" ||
    rawStatus === "failed" ||
    rawStatus === "cancelled" ||
    rawStatus === "expired"
      ? rawStatus
      : "unknown";

  const active =
    payload && typeof payload.active === "boolean"
      ? payload.active
      : false;

  const message =
    payload && typeof payload.message === "string"
      ? payload.message
      : null;

  return {
    ok: true,
    data: {
      status,
      active,
      message,
    },
  };
}