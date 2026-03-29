import { supabase } from "../core/supabase";

export type ResolvedLocationRpcResult = {
  source: "gps_exact" | "gps_district_only" | "gps_uganda_only";
  location_id: string | null;
  country: string | null;
  district: string | null;
  town: string | null;
  sub_county: string | null;
  country_norm: string | null;
  district_norm: string | null;
  town_norm: string | null;
  sub_county_norm: string | null;
  lat: number;
  lng: number;
  distance_meters: number | null;
  requires_manual_selection: boolean;
};

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isNumberOrNull(value: unknown): value is number | null {
  return (typeof value === "number" && Number.isFinite(value)) || value === null;
}

function isResolvedLocationRpcResult(
  value: unknown
): value is ResolvedLocationRpcResult {
  if (!value || typeof value !== "object") return false;

  const v = value as Record<string, unknown>;

  if (
    v.source !== "gps_exact" &&
    v.source !== "gps_district_only" &&
    v.source !== "gps_uganda_only"
  ) {
    return false;
  }

  if (!isStringOrNull(v.location_id)) return false;
  if (!isStringOrNull(v.country)) return false;
  if (!isStringOrNull(v.district)) return false;
  if (!isStringOrNull(v.town)) return false;
  if (!isStringOrNull(v.sub_county)) return false;
  if (!isStringOrNull(v.country_norm)) return false;
  if (!isStringOrNull(v.district_norm)) return false;
  if (!isStringOrNull(v.town_norm)) return false;
  if (!isStringOrNull(v.sub_county_norm)) return false;
  if (typeof v.lat !== "number" || !Number.isFinite(v.lat)) return false;
  if (typeof v.lng !== "number" || !Number.isFinite(v.lng)) return false;
  if (!isNumberOrNull(v.distance_meters)) return false;
  if (typeof v.requires_manual_selection !== "boolean") return false;

  return true;
}

export async function resolveLocationFromCoords(
  lat: number,
  lng: number
): Promise<ResolvedLocationRpcResult | null> {
  const { data, error } = await supabase.rpc("resolve_location_from_coords", {
    p_lat: lat,
    p_lng: lng,
  });

  if (error) {
    if (error.message?.includes("OUTSIDE_SUPPORTED_COUNTRY")) {
      return null;
    }

    console.error("[resolveLocationFromCoords] RPC error:", error);
    return null;
  }

  if (!isResolvedLocationRpcResult(data)) {
    console.error("[resolveLocationFromCoords] Invalid RPC payload:", data);
    return null;
  }

  return data;
}