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
  expired: boolean;
  scope: "local" | "national";
  requested_scope: "local" | "national";
  can_access_national: boolean;
  expires_at: string | null;
  days_remaining: number;
};

export type FeedResolutionLevel =
  | "exact_local"
  | "area_local"
  | "district_only"
  | "uganda_only"
  | "outside_uganda"
  | null;

export type JobsPage = {
  jobs: JobWithCoords[];
  nextCursor: JobsCursor | null;
  premium: PremiumState | null;
  new_jobs_count: number;
  effective_scope: "local" | "national";
  resolution_level: FeedResolutionLevel;
  display_location_label: string | null;
  coverage_note: string | null;
};

export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "OUTSIDE_SUPPORTED_COUNTRY"
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
  district_id?: string | null;
  contact_method: string | null;
  contact_phone?: string | null;
  created_at: string;
  expires_at?: string | null;
  is_sponsored?: boolean | null;
  sponsored_until?: string | null;
  is_currently_sponsored?: boolean | null;
  lat?: number | null;
  lng?: number | null;
  posting_display_label?: string | null;
  posting_resolution_level?: "exact_local" | "area_local" | "district_only" | null;
  posting_resolution_confidence?: number | null;
  approximate_area_radius_meters?: number | null;
  map_visibility_mode?:
    | "exact_pin"
    | "offset_pin"
    | "area_circle"
    | "district_anchor"
    | "hidden"
    | null;
  geo_status?:
    | "validated"
    | "backfilled_legacy"
    | "weak_accuracy"
    | "stale"
    | "outside_supported_country"
    | "rejected"
    | null;
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
  effective_scope?: "local" | "national";
  resolution_level?: FeedResolutionLevel;
  display_location_label?: string | null;
  coverage_note?: string | null;
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isBooleanOrNull(value: unknown): value is boolean | null {
  return value === null || typeof value === "boolean";
}

function isValidScope(value: unknown): value is "local" | "national" {
  return value === "local" || value === "national";
}

function isValidResolutionLevel(value: unknown): value is FeedResolutionLevel {
  return (
    value === "exact_local" ||
    value === "area_local" ||
    value === "district_only" ||
    value === "uganda_only" ||
    value === "outside_uganda" ||
    value === null
  );
}

function isValidPostingResolutionLevel(
  value: unknown,
): value is "exact_local" | "area_local" | "district_only" | null {
  return (
    value === "exact_local" ||
    value === "area_local" ||
    value === "district_only" ||
    value === null
  );
}

function isValidMapVisibilityMode(
  value: unknown,
): value is
  | "exact_pin"
  | "offset_pin"
  | "area_circle"
  | "district_anchor"
  | "hidden"
  | null {
  return (
    value === "exact_pin" ||
    value === "offset_pin" ||
    value === "area_circle" ||
    value === "district_anchor" ||
    value === "hidden" ||
    value === null
  );
}

function isValidGeoStatus(
  value: unknown,
): value is
  | "validated"
  | "backfilled_legacy"
  | "weak_accuracy"
  | "stale"
  | "outside_supported_country"
  | "rejected"
  | null {
  return (
    value === "validated" ||
    value === "backfilled_legacy" ||
    value === "weak_accuracy" ||
    value === "stale" ||
    value === "outside_supported_country" ||
    value === "rejected" ||
    value === null
  );
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

async function getValidAccessToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = session?.expires_at ?? 0;
    const isFreshEnough = expiresAt - nowSeconds > 30;

    if (session?.access_token && isFreshEnough) {
      return session.access_token;
    }

    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession();

    if (refreshError) {
      return null;
    }

    return refreshed.session?.access_token ?? null;
  } catch {
    return null;
  }
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

  const expiresAt =
    candidate.expires_at === null || typeof candidate.expires_at === "string"
      ? candidate.expires_at
      : null;

  const daysRemaining =
    typeof candidate.days_remaining === "number" &&
    Number.isFinite(candidate.days_remaining)
      ? Math.max(0, Math.trunc(candidate.days_remaining))
      : 0;

  const expired =
    typeof candidate.expired === "boolean"
      ? candidate.expired
      : !candidate.active && expiresAt !== null;

  return {
    active: candidate.active,
    expired,
    scope: candidate.scope,
    requested_scope: candidate.requested_scope,
    can_access_national: candidate.can_access_national,
    expires_at: expiresAt,
    days_remaining: daysRemaining,
  };
}

function isValidFeedApiJob(row: unknown): row is FeedApiJob {
  if (!row || typeof row !== "object") return false;

  const job = row as Partial<FeedApiJob>;

  return (
    isNonEmptyString(job.id) &&
    isNonEmptyString(job.title) &&
    isNonEmptyString(job.created_at) &&
    (job.description === undefined || isStringOrNull(job.description)) &&
    (job.pay_type === undefined || isStringOrNull(job.pay_type)) &&
    (job.location_id === undefined || isStringOrNull(job.location_id)) &&
    (job.district_id === undefined || isStringOrNull(job.district_id)) &&
    (job.contact_method === undefined || isStringOrNull(job.contact_method)) &&
    (job.contact_phone === undefined || isStringOrNull(job.contact_phone)) &&
    (job.expires_at === undefined || isStringOrNull(job.expires_at)) &&
    (job.sponsored_until === undefined || isStringOrNull(job.sponsored_until)) &&
    (job.is_sponsored === undefined || isBooleanOrNull(job.is_sponsored)) &&
    (job.is_currently_sponsored === undefined ||
      isBooleanOrNull(job.is_currently_sponsored)) &&
    (job.lat === undefined || job.lat === null || isFiniteNumber(job.lat)) &&
    (job.lng === undefined || job.lng === null || isFiniteNumber(job.lng)) &&
    (job.posting_display_label === undefined ||
      isStringOrNull(job.posting_display_label)) &&
    (job.posting_resolution_level === undefined ||
      isValidPostingResolutionLevel(job.posting_resolution_level)) &&
    (job.posting_resolution_confidence === undefined ||
      job.posting_resolution_confidence === null ||
      isFiniteNumber(job.posting_resolution_confidence)) &&
    (job.approximate_area_radius_meters === undefined ||
      job.approximate_area_radius_meters === null ||
      isFiniteNumber(job.approximate_area_radius_meters)) &&
    (job.map_visibility_mode === undefined ||
      isValidMapVisibilityMode(job.map_visibility_mode)) &&
    (job.geo_status === undefined || isValidGeoStatus(job.geo_status))
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
    isNonEmptyString(cursor.created_at) &&
    isNonEmptyString(cursor.id)
  );
}

function mapJob(row: FeedApiJob): JobWithCoords {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    pay_type: row.pay_type,
    location_id: row.location_id,
    district_id: row.district_id ?? null,
    contact_method: row.contact_method,
    contact_phone: row.contact_phone ?? null,
    created_at: row.created_at,
    expires_at: row.expires_at ?? null,
    is_sponsored: Boolean(row.is_sponsored),
    sponsored_until: row.sponsored_until ?? null,
    is_currently_sponsored: Boolean(row.is_currently_sponsored),
    lat: isFiniteNumber(row.lat) ? row.lat : null,
    lng: isFiniteNumber(row.lng) ? row.lng : null,
    posting_display_label:
      typeof row.posting_display_label === "string"
        ? row.posting_display_label
        : null,
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

  if (
    (!code || typeof code !== "string") &&
    (message === "Invalid JWT" ||
      message === "Unsupported JWT algorithm ES256")
  ) {
    return makeError(
      "SESSION_EXPIRED",
      "Your session has ended. Please sign in again.",
      false,
      fieldErrors,
    );
  }

  if (!code || !message) return null;

  switch (code) {
    case "AUTH_REQUIRED":
      return makeError("AUTH_REQUIRED", "Please sign in again.", retryable, fieldErrors);
    case "SESSION_EXPIRED":
      return makeError("SESSION_EXPIRED", "Your session has ended. Please sign in again.", retryable, fieldErrors);
    case "FORBIDDEN":
      return makeError("FORBIDDEN", message, retryable, fieldErrors);
    case "NOT_FOUND":
      return makeError("NOT_FOUND", message, retryable, fieldErrors);
    case "VALIDATION_ERROR":
      return makeError("VALIDATION_ERROR", message, retryable, fieldErrors);
    case "OUTSIDE_SUPPORTED_COUNTRY":
      return makeError("OUTSIDE_SUPPORTED_COUNTRY", "This nearby feed is only supported inside Uganda.", retryable, fieldErrors);
    case "RATE_LIMIT_DEVICE":
    case "RATE_LIMIT_IP":
      return makeError("RATE_LIMITED", "You’re refreshing too quickly. Please wait a moment.", true, fieldErrors);
    case "RATE_LIMIT_DEVICE_CHECK_FAILED":
    case "RATE_LIMIT_IP_CHECK_FAILED":
    case "RATE_LIMIT_LOG_FAILED":
    case "DATABASE_ERROR":
    case "INVALID_FEED_RESPONSE":
    case "INTERNAL_ERROR":
      return makeError("UNKNOWN_ERROR", message, retryable, fieldErrors);
    default:
      return makeError("UNKNOWN_ERROR", message, retryable, fieldErrors);
  }
}

function classifyTransportError(input: unknown): AppError {
  const message = input instanceof Error ? input.message : String(input ?? "");
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

function normalizeFeedPage(
  input: FeedApiResponse,
  requestedScope: "local" | "national",
): JobsPage {
  const premium = normalizePremiumState(input.premium);

  return {
    jobs: input.jobs.map(mapJob),
    nextCursor: input.nextCursor ?? null,
    premium,
    new_jobs_count:
      typeof input.new_jobs_count === "number" && Number.isFinite(input.new_jobs_count)
        ? Math.max(0, Math.trunc(input.new_jobs_count))
        : 0,
    effective_scope: input.effective_scope ?? premium?.scope ?? requestedScope,
    resolution_level:
      input.resolution_level === undefined ? null : input.resolution_level,
    display_location_label:
      input.display_location_label === undefined
        ? null
        : input.display_location_label,
    coverage_note:
      input.coverage_note === undefined ? null : input.coverage_note,
  };
}

function validateFeedApiResponse(value: unknown): FeedApiResponse | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<FeedApiResponse>;

  if (!Array.isArray(candidate.jobs) || !candidate.jobs.every(isValidFeedApiJob)) {
    return null;
  }

  if (
    candidate.nextCursor !== undefined &&
    candidate.nextCursor !== null &&
    !isValidCursor(candidate.nextCursor)
  ) {
    return null;
  }

  if (
    candidate.premium !== undefined &&
    candidate.premium !== null &&
    !normalizePremiumState(candidate.premium)
  ) {
    return null;
  }

  if (
    candidate.new_jobs_count !== undefined &&
    (typeof candidate.new_jobs_count !== "number" ||
      !Number.isFinite(candidate.new_jobs_count))
  ) {
    return null;
  }

  if (
    candidate.effective_scope !== undefined &&
    !isValidScope(candidate.effective_scope)
  ) {
    return null;
  }

  if (
    candidate.resolution_level !== undefined &&
    !isValidResolutionLevel(candidate.resolution_level)
  ) {
    return null;
  }

  if (
    candidate.display_location_label !== undefined &&
    !isStringOrNull(candidate.display_location_label)
  ) {
    return null;
  }

  if (
    candidate.coverage_note !== undefined &&
    !isStringOrNull(candidate.coverage_note)
  ) {
    return null;
  }

  return {
    jobs: candidate.jobs,
    nextCursor: candidate.nextCursor ?? null,
    premium: candidate.premium ?? null,
    new_jobs_count: candidate.new_jobs_count,
    effective_scope: candidate.effective_scope,
    resolution_level: candidate.resolution_level,
    display_location_label: candidate.display_location_label,
    coverage_note: candidate.coverage_note,
  };
}

async function doFeedRequest(args: {
  accessToken: string | null;
  body: Record<string, unknown>;
}): Promise<Response> {
  const { accessToken, body } = args;

  const bearerToken = accessToken ?? ENV.SUPABASE_ANON_KEY;

  return withTimeout(
    fetch(`${ENV.SUPABASE_URL}/functions/v1/feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
        apikey: ENV.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    }),
  );
}

/* =====================================================
   FEED FETCHER
===================================================== */

export async function fetchFeedPage(params: {
  locationId?: string | null;
  districtId?: string | null;
  cursor?: JobsCursor | null;
  limit?: number;
  requestedScope?: "local" | "national";
}): Promise<AppResult<JobsPage>> {
  const {
    locationId = null,
    districtId = null,
    cursor = null,
    limit = PAGE_SIZE_DEFAULT,
    requestedScope = "local",
  } = params;

  if (requestedScope === "local") {
    const hasExactOrAreaLocal = isNonEmptyString(locationId);
    const hasDistrictFallback = isNonEmptyString(districtId);

    if (!hasExactOrAreaLocal && !hasDistrictFallback) {
      return {
        ok: false,
        error: makeError(
          "VALIDATION_ERROR",
          "We could not match your current area right now.",
          false,
          {
            resolved_location:
              "Canonical location identity is required for local feed.",
          },
        ),
      };
    }
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

  const accessToken = await getValidAccessToken();

  const body = {
    location_id: locationId,
    district_id: districtId,
    device_hash: deviceHash,
    limit: safeLimit,
    requested_scope: requestedScope,
    cursor_is_currently_sponsored:
      cursor?.is_currently_sponsored ?? undefined,
    cursor_sponsored_until: cursor?.sponsored_until ?? undefined,
    cursor_created_at: cursor?.created_at ?? undefined,
    cursor_id: cursor?.id ?? undefined,
  };

  console.log("FEED_REQUEST_BODY", body);

  let res: Response;

  try {
    res = await doFeedRequest({ accessToken, body });

    let rawText = "";
    try {
      rawText = await res.text();
    } catch {
      rawText = "";
    }

    console.log("FEED_HTTP_STATUS", res.status);
    console.log("FEED_RAW_TEXT", rawText);

    let parsedJson = rawText ? tryParseJson<unknown>(rawText) : null;
    console.log("FEED_PARSED_JSON", parsedJson);

    const edgeMessage =
      parsedJson &&
      typeof parsedJson === "object" &&
      "message" in parsedJson &&
      typeof (parsedJson as { message?: unknown }).message === "string"
        ? (parsedJson as { message: string }).message
        : null;

    if (
      res.status === 401 &&
      requestedScope === "local" &&
      (edgeMessage === "Invalid JWT" ||
        edgeMessage === "Unsupported JWT algorithm ES256")
    ) {
      res = await doFeedRequest({ accessToken: null, body });

      rawText = "";
      try {
        rawText = await res.text();
      } catch {
        rawText = "";
      }

      console.log("FEED_HTTP_STATUS_RETRY_GUEST", res.status);
      console.log("FEED_RAW_TEXT_RETRY_GUEST", rawText);

      parsedJson = rawText ? tryParseJson<unknown>(rawText) : null;
      console.log("FEED_PARSED_JSON_RETRY_GUEST", parsedJson);
    }

    if (!res.ok) {
      const normalizedError = normalizeEdgeErrorPayload(parsedJson);
      console.log("FEED_NORMALIZED_ERROR", normalizedError);

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

    const validatedPage = validateFeedApiResponse(parsedJson);
    console.log("FEED_VALIDATED_PAGE", validatedPage);

    if (!validatedPage) {
      return {
        ok: false,
        error: makeError(
          "UNKNOWN_ERROR",
          "The feed response was invalid.",
          false,
        ),
      };
    }

    console.log("FEED_RESPONSE_JSON", validatedPage);

    return {
      ok: true,
      data: normalizeFeedPage(validatedPage, requestedScope),
    };
  } catch (err) {
    return {
      ok: false,
      error: classifyTransportError(err),
    };
  }
}