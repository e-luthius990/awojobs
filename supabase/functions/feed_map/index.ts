import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =====================================================
   CONFIG
===================================================== */

const MAP_LIMIT_DEFAULT = 100;
const MAP_LIMIT_MAX = 200;

const DEVICE_LIMIT_PER_MIN = 60;
const IP_LIMIT_PER_MIN = 120;

/* =====================================================
   TYPES
===================================================== */

type RequestedScope = "local" | "national";

type MapVisibilityMode =
  | "exact_pin"
  | "offset_pin"
  | "area_circle"
  | "district_anchor"
  | "hidden";

type ResolutionLevel =
  | "exact_local"
  | "area_local"
  | "district_only"
  | null;

type MapItem = {
  id: string;
  title: string;
  pay_type: string | null;
  contact_method: string | null;
  is_sponsored: boolean;
  sponsored_until: string | null;
  created_at: string;
  expires_at: string | null;
  location_id: string | null;
  district_id: string | null;
  display_label: string | null;
  resolution_level: ResolutionLevel;
  map_visibility_mode: MapVisibilityMode | null;
  latitude: number;
  longitude: number;
  radius_meters: number | null;
  accuracy_meters: number | null;
};

type MapFeedResponse = {
  effective_scope: RequestedScope;
  requested_scope: RequestedScope;
  is_premium: boolean;
  is_admin: boolean;
  zoom: number;
  limit: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  items: MapItem[];
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseScope(value: unknown): RequestedScope | null {
  if (value === "local" || value === "national") return value;
  return null;
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
        : MAP_LIMIT_DEFAULT;

  if (!Number.isFinite(raw)) return MAP_LIMIT_DEFAULT;
  return Math.min(Math.max(Math.trunc(raw), 1), MAP_LIMIT_MAX);
}

function normalizeZoom(zoom: unknown) {
  const raw =
    typeof zoom === "number"
      ? zoom
      : typeof zoom === "string" && zoom.trim() !== ""
        ? Number(zoom)
        : 12;

  if (!Number.isFinite(raw)) return 12;
  return Math.min(Math.max(Math.trunc(raw), 1), 22);
}

function isValidResolutionLevel(value: unknown): value is ResolutionLevel {
  return (
    value === null ||
    value === "exact_local" ||
    value === "area_local" ||
    value === "district_only"
  );
}

function isValidMapVisibilityMode(value: unknown): value is MapVisibilityMode | null {
  return (
    value === null ||
    value === "exact_pin" ||
    value === "offset_pin" ||
    value === "area_circle" ||
    value === "district_anchor" ||
    value === "hidden"
  );
}

function isValidMapItem(value: unknown): value is MapItem {
  if (!isPlainObject(value)) return false;

  return (
    typeof value.id === "string" &&
    isValidUUID(value.id) &&
    typeof value.title === "string" &&
    (value.pay_type === null || typeof value.pay_type === "string") &&
    (value.contact_method === null || typeof value.contact_method === "string") &&
    typeof value.is_sponsored === "boolean" &&
    (value.sponsored_until === null || isIsoDateString(value.sponsored_until)) &&
    typeof value.created_at === "string" &&
    isIsoDateString(value.created_at) &&
    (value.expires_at === null || isIsoDateString(value.expires_at)) &&
    (value.location_id === null ||
      (typeof value.location_id === "string" && isValidUUID(value.location_id))) &&
    (value.district_id === null ||
      (typeof value.district_id === "string" && isValidUUID(value.district_id))) &&
    (value.display_label === null || typeof value.display_label === "string") &&
    isValidResolutionLevel(value.resolution_level) &&
    isValidMapVisibilityMode(value.map_visibility_mode) &&
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude) &&
    (value.radius_meters === null || isFiniteNumber(value.radius_meters)) &&
    (value.accuracy_meters === null || isFiniteNumber(value.accuracy_meters))
  );
}

function normalizeMapFeedResponse(raw: unknown): MapFeedResponse | null {
  if (!isPlainObject(raw)) return null;
  if (!Array.isArray(raw.items) || !raw.items.every(isValidMapItem)) return null;
  if (!isPlainObject(raw.bounds)) return null;

  const effectiveScope = parseScope(raw.effective_scope);
  const requestedScope = parseScope(raw.requested_scope);
  if (!effectiveScope || !requestedScope) return null;

  const bounds = raw.bounds;
  if (
    !isFiniteNumber(bounds.north) ||
    !isFiniteNumber(bounds.south) ||
    !isFiniteNumber(bounds.east) ||
    !isFiniteNumber(bounds.west)
  ) {
    return null;
  }

  if (
    typeof raw.is_premium !== "boolean" ||
    typeof raw.is_admin !== "boolean" ||
    !isFiniteNumber(raw.zoom) ||
    !isFiniteNumber(raw.limit)
  ) {
    return null;
  }

  return {
    effective_scope: effectiveScope,
    requested_scope: requestedScope,
    is_premium: raw.is_premium,
    is_admin: raw.is_admin,
    zoom: Math.trunc(raw.zoom),
    limit: Math.trunc(raw.limit),
    bounds: {
      north: bounds.north,
      south: bounds.south,
      east: bounds.east,
      west: bounds.west,
    },
    items: raw.items,
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

  if (message.startsWith("VALIDATION_ERROR:")) {
    const field = message.split(":")[1] ?? "request";

    const fieldMap: Record<string, string> = {
      requested_scope: "Requested scope is invalid.",
      bounds: "Map bounds are invalid.",
      bounds_lat_order: "North must be greater than south.",
      bounds_lng_order: "East must be greater than west.",
      bounds_lat_range: "Latitude bounds are invalid.",
      bounds_lng_range: "Longitude bounds are invalid.",
      location_context: "Location context is required for local map feed.",
    };

    return errorResponse(
      400,
      "VALIDATION_ERROR",
      fieldMap[field] ?? "Request is invalid.",
      false,
      { [field]: fieldMap[field] ?? "Request is invalid." },
    );
  }

  if (message === "ACCOUNT_SUSPENDED" || message.startsWith("FORBIDDEN")) {
    return errorResponse(
      403,
      "FORBIDDEN",
      "You do not have access to this map feed request.",
      false,
    );
  }

  return errorResponse(
    500,
    "DATABASE_ERROR",
    "The map feed could not be loaded right now.",
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
      requested_scope,
      north,
      south,
      east,
      west,
      zoom,
      limit,
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

    if (
      !isFiniteNumber(north) ||
      !isFiniteNumber(south) ||
      !isFiniteNumber(east) ||
      !isFiniteNumber(west)
    ) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Map bounds are invalid.",
        false,
        { bounds: "Map bounds are invalid." },
      );
    }

    if (safeScope === "local" && !safeLocationId && !safeDistrictId) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Location context is required for local map feed.",
        false,
        { location_context: "Location context is required for local map feed." },
      );
    }

    const safeZoom = normalizeZoom(zoom);
    const safeLimit = normalizeLimit(limit);

    const service = createServiceClient();
    const rateLimit = await enforceRateLimit(service, ip, device_hash);

    if (!rateLimit.ok) {
      if (rateLimit.status === 429) {
        return errorResponse(
          429,
          rateLimit.code,
          "Too many map feed requests. Please slow down.",
          true,
        );
      }

      return errorResponse(
        500,
        rateLimit.code,
        "Map feed rate limiting failed.",
        true,
      );
    }

    const userResult = await getUserFromJWT(req);

    const rpcClient =
      userResult.kind === "user" ? createRequestClient(req) : supabaseAnon;

    const { data, error } = await rpcClient.rpc("get_feed_map", {
      p_location_id: safeLocationId,
      p_district_id: safeDistrictId,
      p_requested_scope: safeScope,
      p_north: north,
      p_south: south,
      p_east: east,
      p_west: west,
      p_zoom: safeZoom,
      p_limit: safeLimit,
    });

    if (error) {
      console.error("[get_feed_map RPC]", {
        scope: safeScope,
        is_guest: userResult.kind !== "user",
        has_canonical_location: safeLocationId !== null,
        has_district_fallback: safeDistrictId !== null,
        zoom: safeZoom,
        limit: safeLimit,
        ip,
        message: error.message,
        code: error.code,
        details: error.details,
      });

      return mapRpcErrorToEdge(error);
    }

    const normalized = normalizeMapFeedResponse(data);
    if (!normalized) {
      console.error("[get_feed_map invalid_response_shape]", { data });
      return errorResponse(
        500,
        "INVALID_MAP_FEED_RESPONSE",
        "The map feed response was invalid.",
        true,
      );
    }

    return json(normalized);
  } catch (err) {
    console.error("[feed_map]", err);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "The map feed could not be loaded right now.",
      true,
    );
  }
});