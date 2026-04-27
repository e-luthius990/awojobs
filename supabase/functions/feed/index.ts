import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =====================================================
   CONFIG
===================================================== */

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

const DEVICE_LIMIT_PER_MIN = 60;
const IP_LIMIT_PER_MIN = 120;

/* =====================================================
   TYPES
===================================================== */

type FeedCursor = {
  is_currently_sponsored: boolean;
  sponsored_until: string | null;
  created_at: string;
  id: string;
};

type PremiumState = {
  active: boolean;
  expired: boolean;
  scope: "local" | "national";
  requested_scope: "local" | "national";
  can_access_national: boolean;
  expires_at: string | null;
  days_remaining: number;
};

type FeedJob = {
  id: string;
  title: string;
  description: string | null;
  pay_type: string | null;
  location_id: string | null;
  district_id?: string | null;
  contact_method: string | null;
  contact_phone: string | null;
  created_at: string;
  expires_at: string | null;
  is_sponsored: boolean;
  sponsored_until: string | null;
  is_currently_sponsored: boolean;
  posting_display_label?: string | null;
  posting_resolution_level?: string | null;
  posting_resolution_confidence?: number | null;
  approximate_area_radius_meters?: number | null;
  map_visibility_mode?: string | null;
  geo_status?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type FeedResponse = {
  premium: PremiumState;
  effective_scope: "local" | "national";
  resolution_level:
    | "exact_local"
    | "area_local"
    | "district_only"
    | "uganda_only"
    | "outside_uganda"
    | null;
  display_location_label: string | null;
  coverage_note: string | null;
  jobs: FeedJob[];
  nextCursor: FeedCursor | null;
  new_jobs_count: number;
};

type ErrorBody = {
  code: string;
  message: string;
  retryable: boolean;
  fieldErrors?: Record<string, string>;
};

type JwtResult =
  | { kind: "guest" }
  | { kind: "user"; user: { id: string } };

type RateLimitResult =
  | { ok: true }
  | { ok: false; code: "RATE_LIMIT_DEVICE" | "RATE_LIMIT_IP"; status: 429 }
  | {
      ok: false;
      code:
        | "RATE_LIMIT_DEVICE_CHECK_FAILED"
        | "RATE_LIMIT_IP_CHECK_FAILED"
        | "RATE_LIMIT_LOG_FAILED";
      status: 500;
    };

/* =====================================================
   CLIENTS
===================================================== */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

function createRequestClient(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        authorization: authHeader,
      },
    },
  });
}

/* =====================================================
   HELPERS
===================================================== */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  retryable: boolean,
  fieldErrors?: Record<string, string>,
) {
  return json(
    {
      code,
      message,
      retryable,
      ...(fieldErrors ? { fieldErrors } : {}),
    } satisfies ErrorBody,
    status,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidUUID(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function normalizeIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  return first && first.length <= 128 ? first : "unknown";
}

function normalizeLimit(limit: unknown) {
  const raw =
    typeof limit === "number"
      ? limit
      : typeof limit === "string" && limit.trim() !== ""
        ? Number(limit)
        : PAGE_SIZE_DEFAULT;

  if (!Number.isFinite(raw)) return PAGE_SIZE_DEFAULT;
  return Math.min(Math.max(Math.trunc(raw), 1), PAGE_SIZE_MAX);
}

function parseScope(value: unknown): "local" | "national" | null {
  if (value === "local" || value === "national") return value;
  return null;
}

function isValidCursor(value: unknown): value is FeedCursor {
  if (!isPlainObject(value)) return false;

  const {
    is_currently_sponsored,
    sponsored_until,
    created_at,
    id,
  } = value;

  if (typeof is_currently_sponsored !== "boolean") return false;
  if (!isIsoDateString(created_at)) return false;
  if (typeof id !== "string" || !isValidUUID(id)) return false;

  const sponsoredUntilOk =
    sponsored_until === null || isIsoDateString(sponsored_until);

  if (!sponsoredUntilOk) return false;
  if (!is_currently_sponsored && sponsored_until !== null) return false;

  return true;
}

function isValidFeedJob(value: unknown): value is FeedJob {
  if (!isPlainObject(value)) return false;

  return (
    typeof value.id === "string" &&
    isValidUUID(value.id) &&
    typeof value.title === "string" &&
    typeof value.created_at === "string" &&
    !Number.isNaN(Date.parse(value.created_at)) &&
    typeof value.is_sponsored === "boolean" &&
    typeof value.is_currently_sponsored === "boolean" &&
    (value.description === null || typeof value.description === "string") &&
    (value.pay_type === null || typeof value.pay_type === "string") &&
    (value.location_id === null ||
      (typeof value.location_id === "string" && isValidUUID(value.location_id))) &&
    (value.district_id === undefined ||
      value.district_id === null ||
      (typeof value.district_id === "string" && isValidUUID(value.district_id))) &&
    (value.contact_method === null || typeof value.contact_method === "string") &&
    (value.contact_phone === null || typeof value.contact_phone === "string") &&
    (value.expires_at === null || isIsoDateString(value.expires_at)) &&
    (value.sponsored_until === null || isIsoDateString(value.sponsored_until)) &&
    (value.posting_display_label === undefined ||
      value.posting_display_label === null ||
      typeof value.posting_display_label === "string") &&
    (value.posting_resolution_level === undefined ||
      value.posting_resolution_level === null ||
      typeof value.posting_resolution_level === "string") &&
    (value.posting_resolution_confidence === undefined ||
      value.posting_resolution_confidence === null ||
      typeof value.posting_resolution_confidence === "number") &&
    (value.approximate_area_radius_meters === undefined ||
      value.approximate_area_radius_meters === null ||
      typeof value.approximate_area_radius_meters === "number") &&
    (value.map_visibility_mode === undefined ||
      value.map_visibility_mode === null ||
      typeof value.map_visibility_mode === "string") &&
    (value.geo_status === undefined ||
      value.geo_status === null ||
      typeof value.geo_status === "string") &&
    (value.lat === undefined || value.lat === null || typeof value.lat === "number") &&
    (value.lng === undefined || value.lng === null || typeof value.lng === "number")
  );
}

function normalizePremiumState(
  value: unknown,
  requestedScopeFallback: "local" | "national",
): PremiumState {
  if (!isPlainObject(value)) {
    return {
      active: false,
      expired: false,
      scope: "local",
      requested_scope: requestedScopeFallback,
      can_access_national: false,
      expires_at: null,
      days_remaining: 0,
    };
  }

  const active = value.active === true;
  const canAccessNational = value.can_access_national === true;

  const requested_scope =
    value.requested_scope === "national" || value.requested_scope === "local"
      ? value.requested_scope
      : requestedScopeFallback;

  const scope =
    value.scope === "national" && canAccessNational ? "national" : "local";

  const expires_at =
    value.expires_at === null || typeof value.expires_at === "string"
      ? value.expires_at
      : null;

  const days_remaining =
    typeof value.days_remaining === "number" && Number.isFinite(value.days_remaining)
      ? Math.max(0, Math.trunc(value.days_remaining))
      : 0;

  const expired =
    typeof value.expired === "boolean"
      ? value.expired
      : !active && expires_at !== null;

  return {
    active,
    expired,
    scope,
    requested_scope,
    can_access_national: canAccessNational,
    expires_at,
    days_remaining,
  };
}

function isValidResolutionLevel(
  value: unknown,
): value is
  | "exact_local"
  | "area_local"
  | "district_only"
  | "uganda_only"
  | "outside_uganda" {
  return (
    value === "exact_local" ||
    value === "area_local" ||
    value === "district_only" ||
    value === "uganda_only" ||
    value === "outside_uganda"
  );
}

function normalizeFeedResponse(
  raw: unknown,
  requestedScope: "local" | "national",
): FeedResponse | null {
  if (!isPlainObject(raw)) return null;

  const premium = normalizePremiumState(raw.premium, requestedScope);

  const effectiveScope =
    raw.effective_scope === "national" || raw.effective_scope === "local"
      ? raw.effective_scope
      : premium.scope;

  const resolutionLevel =
    raw.resolution_level === null
      ? null
      : isValidResolutionLevel(raw.resolution_level)
        ? raw.resolution_level
        : null;

  const displayLocationLabel =
    typeof raw.display_location_label === "string"
      ? raw.display_location_label
      : raw.display_location_label === null
        ? null
        : null;

  const coverageNote =
    typeof raw.coverage_note === "string"
      ? raw.coverage_note
      : raw.coverage_note === null
        ? null
        : null;

  const jobsRaw = raw.jobs;
  if (!Array.isArray(jobsRaw) || !jobsRaw.every(isValidFeedJob)) {
    return null;
  }

  const nextCursorRaw = raw.nextCursor === undefined ? null : raw.nextCursor;
  if (nextCursorRaw !== null && !isValidCursor(nextCursorRaw)) {
    return null;
  }

  const newJobsCount =
    typeof raw.new_jobs_count === "number" &&
    Number.isFinite(raw.new_jobs_count) &&
    raw.new_jobs_count >= 0
      ? Math.trunc(raw.new_jobs_count)
      : 0;

  return {
    premium,
    effective_scope: effectiveScope,
    resolution_level: resolutionLevel,
    display_location_label: displayLocationLabel,
    coverage_note: coverageNote,
    jobs: jobsRaw,
    nextCursor: nextCursorRaw,
    new_jobs_count: newJobsCount,
  };
}

function logContext(input: {
  scope: "local" | "national";
  isGuest: boolean;
  hasCanonicalLocation: boolean;
  hasDistrictFallback: boolean;
  pageSize: number;
  hasCursor: boolean;
  ip: string;
}) {
  return {
    scope: input.scope,
    is_guest: input.isGuest,
    has_canonical_location: input.hasCanonicalLocation,
    has_district_fallback: input.hasDistrictFallback,
    page_size: input.pageSize,
    has_cursor: input.hasCursor,
    ip: input.ip,
  };
}

/* =====================================================
   JWT EXTRACT
===================================================== */

async function getUserFromJWT(req: Request): Promise<JwtResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { kind: "guest" };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return { kind: "guest" };
  }

  if (
    token === SUPABASE_ANON_KEY ||
    token === SUPABASE_SERVICE_ROLE_KEY ||
    token.split(".").length !== 3
  ) {
    return { kind: "guest" };
  }

  try {
    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error || !data?.user?.id) {
      return { kind: "guest" };
    }

    return { kind: "user", user: { id: data.user.id } };
  } catch {
    return { kind: "guest" };
  }
}

/* =====================================================
   RATE LIMIT
===================================================== */

async function enforceRateLimit(
  supabase: ReturnType<typeof createServiceClient>,
  ip: string,
  device_hash: string,
): Promise<RateLimitResult> {
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

  const { count: deviceCount, error: deviceError } = await supabase
    .from("feed_rate_log")
    .select("id", { count: "exact", head: true })
    .eq("device_hash", device_hash)
    .gt("created_at", oneMinuteAgo);

  if (deviceError) {
    return {
      ok: false,
      code: "RATE_LIMIT_DEVICE_CHECK_FAILED",
      status: 500,
    };
  }

  if ((deviceCount ?? 0) >= DEVICE_LIMIT_PER_MIN) {
    return {
      ok: false,
      code: "RATE_LIMIT_DEVICE",
      status: 429,
    };
  }

  const { count: ipCount, error: ipError } = await supabase
    .from("feed_rate_log")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gt("created_at", oneMinuteAgo);

  if (ipError) {
    return {
      ok: false,
      code: "RATE_LIMIT_IP_CHECK_FAILED",
      status: 500,
    };
  }

  if ((ipCount ?? 0) >= IP_LIMIT_PER_MIN) {
    return {
      ok: false,
      code: "RATE_LIMIT_IP",
      status: 429,
    };
  }

  const { error: insertError } = await supabase.from("feed_rate_log").insert({
    ip,
    device_hash,
  });

  if (insertError) {
    return {
      ok: false,
      code: "RATE_LIMIT_LOG_FAILED",
      status: 500,
    };
  }

  return { ok: true };
}

/* =====================================================
   RPC ERROR MAPPING
===================================================== */

function mapRpcErrorToEdge(error: {
  message?: string;
  code?: string;
  details?: string;
}) {
  const message = (error.message ?? "").trim();

  if (message === "VALIDATION_ERROR:requested_scope") {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Requested scope is invalid.",
      false,
      { requested_scope: "Requested scope is invalid." },
    );
  }

  if (message === "VALIDATION_ERROR:cursor") {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Cursor is invalid.",
      false,
      { cursor: "Cursor is invalid." },
    );
  }

  if (message === "VALIDATION_ERROR:location_id") {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Location ID is invalid.",
      false,
      { location_id: "Location ID is invalid." },
    );
  }

  if (message === "VALIDATION_ERROR:district_id") {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "District ID is invalid.",
      false,
      { district_id: "District ID is invalid." },
    );
  }

  if (message === "VALIDATION_ERROR:resolved_location") {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Resolved location is invalid.",
      false,
      { resolved_location: "Resolved location is invalid." },
    );
  }

  if (message === "AUTH_REQUIRED") {
    return errorResponse(401, "AUTH_REQUIRED", "Please sign in again.", false);
  }

  if (message === "PROFILE_NOT_FOUND") {
    return errorResponse(
      404,
      "NOT_FOUND",
      "Your profile could not be loaded.",
      false,
    );
  }

  if (message === "OUTSIDE_SUPPORTED_COUNTRY") {
    return errorResponse(
      400,
      "OUTSIDE_SUPPORTED_COUNTRY",
      "This nearby feed is only supported inside Uganda.",
      false,
    );
  }

  if (
    message === "ACCOUNT_SUSPENDED" ||
    message.startsWith("FORBIDDEN")
  ) {
    return errorResponse(
      403,
      "FORBIDDEN",
      "You do not have access to this feed request.",
      false,
    );
  }

  return errorResponse(
    500,
    "DATABASE_ERROR",
    "The feed could not be loaded right now.",
    true,
  );
}

/* =====================================================
   MAIN
===================================================== */

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return errorResponse(
        405,
        "METHOD_NOT_ALLOWED",
        "Only POST is allowed.",
        false,
      );
    }

    const ip = normalizeIp(req);

    const parsed = await req.json().catch(() => null);
    if (!isPlainObject(parsed)) {
      return errorResponse(
        400,
        "INVALID_JSON",
        "Request body is invalid.",
        false,
      );
    }

    const {
      location_id,
      district_id,
      device_hash,
      limit,
      cursor_is_currently_sponsored,
      cursor_sponsored_until,
      cursor_created_at,
      cursor_id,
      requested_scope,
    } = parsed;

    if (
      !device_hash ||
      typeof device_hash !== "string" ||
      !/^[a-f0-9]{64}$/i.test(device_hash)
    ) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Device hash is invalid.",
        false,
        { device_hash: "Device hash is invalid." },
      );
    }

    const safeScope = parseScope(requested_scope);
    if (!safeScope) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Requested scope must be local or national.",
        false,
        { requested_scope: "Requested scope must be local or national." },
      );
    }

    let safeLocationId: string | null = null;
    let safeDistrictId: string | null = null;

    if (location_id !== undefined && location_id !== null) {
      if (typeof location_id !== "string" || !isValidUUID(location_id)) {
        return errorResponse(
          400,
          "VALIDATION_ERROR",
          "Location ID is invalid.",
          false,
          { location_id: "Location ID is invalid." },
        );
      }

      safeLocationId = location_id;
    }

    if (district_id !== undefined && district_id !== null) {
      if (typeof district_id !== "string" || !isValidUUID(district_id)) {
        return errorResponse(
          400,
          "VALIDATION_ERROR",
          "District ID is invalid.",
          false,
          { district_id: "District ID is invalid." },
        );
      }

      safeDistrictId = district_id;
    }

    if (safeScope === "local" && !safeLocationId && !safeDistrictId) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Resolved location is required for local feed.",
        false,
        { resolved_location: "Resolved location is required for local feed." },
      );
    }

    let safeCursorIsCurrentlySponsored: boolean | null = null;
    let safeCursorSponsoredUntil: string | null = null;
    let safeCursorCreatedAt: string | null = null;
    let safeCursorId: string | null = null;

    const hasAnyCursor =
      cursor_is_currently_sponsored !== undefined ||
      cursor_sponsored_until !== undefined ||
      cursor_created_at !== undefined ||
      cursor_id !== undefined;

    if (hasAnyCursor) {
      const sponsoredOk = typeof cursor_is_currently_sponsored === "boolean";

      const sponsoredUntilOk =
        cursor_sponsored_until === null ||
        cursor_sponsored_until === undefined ||
        isIsoDateString(cursor_sponsored_until);

      const createdAtOk = isIsoDateString(cursor_created_at);
      const idOk = typeof cursor_id === "string" && isValidUUID(cursor_id);

      if (!sponsoredOk || !sponsoredUntilOk || !createdAtOk || !idOk) {
        return errorResponse(
          400,
          "VALIDATION_ERROR",
          "Cursor is invalid.",
          false,
          { cursor: "Cursor is invalid." },
        );
      }

      if (
        cursor_is_currently_sponsored === false &&
        cursor_sponsored_until !== null &&
        cursor_sponsored_until !== undefined
      ) {
        return errorResponse(
          400,
          "VALIDATION_ERROR",
          "Cursor is invalid.",
          false,
          { cursor: "Cursor is invalid." },
        );
      }

      safeCursorIsCurrentlySponsored = cursor_is_currently_sponsored;
      safeCursorSponsoredUntil = cursor_sponsored_until ?? null;
      safeCursorCreatedAt = cursor_created_at;
      safeCursorId = cursor_id;
    }

    const pageSize = normalizeLimit(limit);
    const service = createServiceClient();

    const rateLimit = await enforceRateLimit(service, ip, device_hash);
    if (!rateLimit.ok) {
      if (rateLimit.status === 429) {
        return errorResponse(
          429,
          rateLimit.code,
          "Too many feed requests. Please slow down.",
          true,
        );
      }

      return errorResponse(
        500,
        rateLimit.code,
        "Feed rate limiting failed.",
        true,
      );
    }

    const userResult = await getUserFromJWT(req);

    const requestLog = logContext({
      scope: safeScope,
      isGuest: userResult.kind !== "user",
      hasCanonicalLocation: safeLocationId !== null,
      hasDistrictFallback: safeDistrictId !== null,
      pageSize,
      hasCursor: hasAnyCursor,
      ip,
    });

    const rpcClient =
      userResult.kind === "user" ? createRequestClient(req) : supabaseAnon;

    const { data, error } = await rpcClient.rpc("get_feed", {
      p_location_id: safeLocationId,
      p_district_id: safeDistrictId,
      p_requested_scope: safeScope,
      p_limit: pageSize,
      p_cursor_is_currently_sponsored: safeCursorIsCurrentlySponsored,
      p_cursor_sponsored_until: safeCursorSponsoredUntil,
      p_cursor_created_at: safeCursorCreatedAt,
      p_cursor_id: safeCursorId,
    });

    if (error) {
      console.error("[get_feed RPC]", {
        ...requestLog,
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return mapRpcErrorToEdge(error);
    }

    if (data == null) {
      return json({
        premium: {
          active: false,
          expired: false,
          scope: "local",
          requested_scope: safeScope,
          can_access_national: false,
          expires_at: null,
          days_remaining: 0,
        },
        effective_scope: safeScope === "national" ? "national" : "local",
        resolution_level: null,
        display_location_label: null,
        coverage_note: null,
        jobs: [],
        nextCursor: null,
        new_jobs_count: 0,
      } satisfies FeedResponse);
    }

    const normalized = normalizeFeedResponse(data, safeScope);
    if (!normalized) {
      console.error("[get_feed invalid_response_shape]", {
        ...requestLog,
        data,
      });

      return errorResponse(
        500,
        "INVALID_FEED_RESPONSE",
        "The feed response was invalid.",
        true,
      );
    }

    return json(normalized);
  } catch (err) {
    console.error("[feed]", err);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "The feed could not be loaded right now.",
      true,
    );
  }
});