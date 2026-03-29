import { supabase } from "../core/supabase";
import { ENV } from "../env";
import type { JobWithCoords } from "./jobs.types";
import type { JobsCursor } from "./jobs.cursor";
import { getDeviceHash } from "../security/device";

/* =====================================================
   CONFIG
===================================================== */

const FEED_REQUEST_TIMEOUT_MS = 10000;
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

/* =====================================================
   TYPES
===================================================== */

export type PremiumState = {
  active: boolean;
  scope: "local" | "national";
  requested_scope: "local" | "national";
  can_access_national: boolean;
};

export type JobsPage = {
  jobs: JobWithCoords[];
  nextCursor: JobsCursor | null;
  premium: PremiumState | null;
  new_jobs_count: number;
};

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

type FeedApiJob = {
  id: string;
  title: string;
  description: string | null;
  pay_type: string | null;
  location_id: string | null;
  contact_method: string | null;
  contact_phone?: string | null;
  created_at: string;
  expires_at?: string | null;
  is_sponsored?: boolean | null;
  sponsored_until?: string | null;
  is_currently_sponsored?: boolean | null;
};

type EdgeErrorPayload = {
  code?: unknown;
  message?: unknown;
  retryable?: unknown;
  fieldErrors?: unknown;
};

type FeedApiResponse = {
  jobs?: FeedApiJob[];
  nextCursor?: JobsCursor | null;
  premium?: PremiumState | null;
  new_jobs_count?: number;
};

/* =====================================================
   HELPERS
===================================================== */

function normalizeLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return PAGE_SIZE_DEFAULT;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), PAGE_SIZE_MAX);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = FEED_REQUEST_TIMEOUT_MS,
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

function tryParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isValidScope(value: unknown): value is "local" | "national" {
  return value === "local" || value === "national";
}

function normalizePremiumState(value: unknown): PremiumState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<PremiumState>;

  if (
    typeof candidate.active !== "boolean" ||
    !isValidScope(candidate.scope) ||
    !isValidScope(candidate.requested_scope) ||
    typeof candidate.can_access_national !== "boolean"
  ) {
    return null;
  }

  return {
    active: candidate.active,
    scope: candidate.scope,
    requested_scope: candidate.requested_scope,
    can_access_national: candidate.can_access_national,
  };
}

function isValidFeedApiJob(row: unknown): row is FeedApiJob {
  if (!row || typeof row !== "object") return false;

  const job = row as Partial<FeedApiJob>;

  return (
    typeof job.id === "string" &&
    job.id.trim().length > 0 &&
    typeof job.title === "string" &&
    job.title.trim().length > 0 &&
    typeof job.created_at === "string" &&
    job.created_at.trim().length > 0
  );
}

function isValidCursor(value: unknown): value is JobsCursor {
  if (!value || typeof value !== "object") return false;

  const cursor = value as Partial<JobsCursor>;

  return (
    typeof cursor.is_currently_sponsored === "boolean" &&
    (cursor.sponsored_until === null ||
      cursor.sponsored_until === undefined ||
      typeof cursor.sponsored_until === "string") &&
    typeof cursor.created_at === "string" &&
    cursor.created_at.trim().length > 0 &&
    typeof cursor.id === "string" &&
    cursor.id.trim().length > 0
  );
}

function mapJob(row: FeedApiJob): JobWithCoords {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    pay_type: row.pay_type,
    location_id: row.location_id,
    contact_method: row.contact_method,
    contact_phone: row.contact_phone ?? null,
    created_at: row.created_at,
    expires_at: row.expires_at ?? null,
    is_sponsored: Boolean(row.is_sponsored),
    sponsored_until: row.sponsored_until ?? null,
    is_currently_sponsored: Boolean(row.is_currently_sponsored),
    lat: null,
    lng: null,
  };
}

function makeError(
  code: AppErrorCode,
  message: string,
  retryable: boolean,
  fieldErrors?: Record<string, string>,
): AppError {
  return { code, message, retryable, fieldErrors };
}

function normalizeEdgeErrorPayload(payload: unknown): AppError | null {
  if (!payload || typeof payload !== "object") return null;

  const raw = payload as EdgeErrorPayload;
  const code = typeof raw.code === "string" ? raw.code : null;
  const message = typeof raw.message === "string" ? raw.message : null;
  const retryable =
    typeof raw.retryable === "boolean" ? raw.retryable : false;

  const fieldErrors =
    raw.fieldErrors &&
    typeof raw.fieldErrors === "object" &&
    !Array.isArray(raw.fieldErrors)
      ? (raw.fieldErrors as Record<string, string>)
      : undefined;

  if (!code || !message) return null;

  switch (code) {
    case "AUTH_REQUIRED":
      return makeError(
        "AUTH_REQUIRED",
        "Please sign in again.",
        retryable,
        fieldErrors,
      );

    case "SESSION_EXPIRED":
      return makeError(
        "SESSION_EXPIRED",
        "Your session has ended. Please sign in again.",
        retryable,
        fieldErrors,
      );

    case "FORBIDDEN":
      return makeError(
        "FORBIDDEN",
        message,
        retryable,
        fieldErrors,
      );

    case "NOT_FOUND":
      return makeError(
        "NOT_FOUND",
        message,
        retryable,
        fieldErrors,
      );

    case "VALIDATION_ERROR":
      return makeError(
        "VALIDATION_ERROR",
        message,
        retryable,
        fieldErrors,
      );

    case "RATE_LIMIT_DEVICE":
    case "RATE_LIMIT_IP":
      return makeError(
        "RATE_LIMITED",
        "You’re refreshing too quickly. Please wait a moment.",
        true,
        fieldErrors,
      );

    case "RATE_LIMIT_DEVICE_CHECK_FAILED":
    case "RATE_LIMIT_IP_CHECK_FAILED":
    case "RATE_LIMIT_LOG_FAILED":
    case "DATABASE_ERROR":
    case "INVALID_FEED_RESPONSE":
    case "INTERNAL_ERROR":
      return makeError(
        "UNKNOWN_ERROR",
        message,
        retryable,
        fieldErrors,
      );

    default:
      return makeError(
        "UNKNOWN_ERROR",
        message,
        retryable,
        fieldErrors,
      );
  }
}

function classifyTransportError(input: unknown): AppError {
  const message =
    input instanceof Error ? input.message : String(input ?? "");

  const normalized = message.toLowerCase();

  if (
    normalized.includes("network_timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network request failed") ||
    normalized.includes("network")
  ) {
    return makeError(
      "NETWORK_ERROR",
      "We could not load jobs right now. Check your internet connection and try again.",
      true,
    );
  }

  return makeError(
    "UNKNOWN_ERROR",
    "We could not load jobs right now. Please try again.",
    true,
  );
}

/* =====================================================
   FEED FETCHER
===================================================== */

export async function fetchFeedPage(params: {
  locationId: string | null;
  cursor?: JobsCursor | null;
  limit?: number;
  requestedScope?: "local" | "national";
}): Promise<AppResult<JobsPage>> {
  const {
    locationId,
    cursor = null,
    limit = PAGE_SIZE_DEFAULT,
    requestedScope = "local",
  } = params;

  if (requestedScope === "local" && !locationId) {
    return {
      ok: false,
      error: makeError(
        "VALIDATION_ERROR",
        "Turn on location to view local jobs.",
        false,
        { location_id: "Location is required for the local feed." },
      ),
    };
  }

  const safeLimit = normalizeLimit(limit);

  const deviceHash = await getDeviceHash();
  if (!deviceHash) {
    return {
      ok: false,
      error: makeError(
        "UNKNOWN_ERROR",
        "We could not secure this request. Please reopen the app and try again.",
        false,
        { device_hash: "Device hash is unavailable." },
      ),
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return {
      ok: false,
      error: makeError(
        "SESSION_EXPIRED",
        "We could not verify your session. Please reopen the app and try again.",
        false,
      ),
    };
  }

  const token = session?.access_token ?? null;

  const body = {
    location_id: requestedScope === "local" ? locationId : null,
    device_hash: deviceHash,
    limit: safeLimit,
    requested_scope: requestedScope,
    cursor_is_currently_sponsored:
      cursor?.is_currently_sponsored ?? undefined,
    cursor_sponsored_until: cursor?.sponsored_until ?? undefined,
    cursor_created_at: cursor?.created_at ?? undefined,
    cursor_id: cursor?.id ?? undefined,
  };

  let res: Response;

  try {
    res = await withTimeout(
      fetch(`${ENV.SUPABASE_URL}/functions/v1/feed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      }),
    );
  } catch (err) {
    return {
      ok: false,
      error: classifyTransportError(err),
    };
  }

  let rawText = "";
  try {
    rawText = await res.text();
  } catch {
    rawText = "";
  }

  const parsedErrorPayload = rawText
    ? tryParseJson<EdgeErrorPayload>(rawText)
    : null;

  const parsedSuccessPayload = rawText
    ? tryParseJson<FeedApiResponse>(rawText)
    : null;

  if (!res.ok) {
    const normalizedError = normalizeEdgeErrorPayload(parsedErrorPayload);

    if (normalizedError) {
      return { ok: false, error: normalizedError };
    }

    return {
      ok: false,
      error: makeError(
        "UNKNOWN_ERROR",
        "We could not load jobs right now. Please try again.",
        res.status >= 500,
      ),
    };
  }

  const data = parsedSuccessPayload ?? {};

  const jobs = Array.isArray(data.jobs)
    ? data.jobs.filter(isValidFeedApiJob).map(mapJob)
    : [];

  const premium = normalizePremiumState(data.premium);

  if (data.nextCursor !== undefined && data.nextCursor !== null) {
    if (!isValidCursor(data.nextCursor)) {
      return {
        ok: false,
        error: makeError(
          "UNKNOWN_ERROR",
          "The feed response was invalid.",
          false,
        ),
      };
    }
  }

  if (jobs.length > 0 && data.nextCursor === undefined) {
    return {
      ok: false,
      error: makeError(
        "UNKNOWN_ERROR",
        "The feed response was invalid.",
        false,
      ),
    };
  }

  return {
    ok: true,
    data: {
      jobs,
      nextCursor: data.nextCursor ?? null,
      premium,
      new_jobs_count:
        typeof data.new_jobs_count === "number" &&
        Number.isFinite(data.new_jobs_count)
          ? Math.max(0, Math.trunc(data.new_jobs_count))
          : 0,
    },
  };
}