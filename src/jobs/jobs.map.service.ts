import { ENV } from "../env";
import { getDeviceHash } from "../security/device";
import { supabase } from "../core/supabase";

type MapFeedItem = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  display_label: string | null;
  resolution_level: "exact_local" | "area_local" | "district_only" | null;
  map_visibility_mode:
    | "exact_pin"
    | "offset_pin"
    | "area_circle"
    | "district_anchor"
    | "hidden"
    | null;
  radius_meters?: number | null;
};

type MapFeedResponse = {
  effective_scope: "local" | "national";
  requested_scope: "local" | "national";
  items: MapFeedItem[];
};

type AppResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string } };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isValidMapFeedItem(value: unknown): value is MapFeedItem {
  if (!isPlainObject(value)) return false;

  return (
    isValidUuid(value.id) &&
    typeof value.title === "string" &&
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    (value.display_label === null || typeof value.display_label === "string") &&
    (value.resolution_level === "exact_local" ||
      value.resolution_level === "area_local" ||
      value.resolution_level === "district_only" ||
      value.resolution_level === null) &&
    (value.map_visibility_mode === "exact_pin" ||
      value.map_visibility_mode === "offset_pin" ||
      value.map_visibility_mode === "area_circle" ||
      value.map_visibility_mode === "district_anchor" ||
      value.map_visibility_mode === "hidden" ||
      value.map_visibility_mode === null) &&
    (value.radius_meters === undefined ||
      value.radius_meters === null ||
      (typeof value.radius_meters === "number" &&
        Number.isFinite(value.radius_meters)))
  );
}

function isValidMapFeedResponse(value: unknown): value is MapFeedResponse {
  if (!isPlainObject(value)) return false;

  return (
    (value.effective_scope === "local" || value.effective_scope === "national") &&
    (value.requested_scope === "local" || value.requested_scope === "national") &&
    Array.isArray(value.items) &&
    value.items.every(isValidMapFeedItem)
  );
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

async function safeParseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: "The map feed returned invalid JSON." };
  }
}

export async function fetchMapFeed(params: {
  locationId?: string | null;
  districtId?: string | null;
  requestedScope: "local" | "national";
  north: number;
  south: number;
  east: number;
  west: number;
  zoom?: number;
  limit?: number;
}): Promise<AppResult<MapFeedResponse>> {
  try {
    const deviceHash = await getDeviceHash();
    const token = await getAccessToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: ENV.SUPABASE_ANON_KEY,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/feed_map`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        location_id: params.locationId ?? null,
        district_id: params.districtId ?? null,
        requested_scope: params.requestedScope,
        north: params.north,
        south: params.south,
        east: params.east,
        west: params.west,
        zoom: params.zoom ?? 13,
        limit: params.limit ?? 100,
        device_hash: deviceHash,
      }),
    });

    const parsed = await safeParseJson(res);

    if (!res.ok) {
      return {
        ok: false,
        error: {
          message:
            isPlainObject(parsed) && typeof parsed.message === "string"
              ? parsed.message
              : "Could not load map jobs.",
        },
      };
    }

    if (!isValidMapFeedResponse(parsed)) {
      return {
        ok: false,
        error: { message: "The map feed response was invalid." },
      };
    }

    return {
      ok: true,
      data: parsed,
    };
  } catch {
    return {
      ok: false,
      error: { message: "Could not load map jobs." },
    };
  }
}