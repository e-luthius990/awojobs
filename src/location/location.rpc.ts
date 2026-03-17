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

export async function resolveLocationFromCoords(
  lat: number,
  lng: number
): Promise<ResolvedLocationRpcResult | null> {
  const { data, error } = await supabase.rpc(
    "resolve_location_from_coords",
    {
      p_lat: lat,
      p_lng: lng,
    }
  );

  if (error) {
    if (error.message?.includes("OUTSIDE_SUPPORTED_COUNTRY")) {
      return null;
    }

    console.error("[resolveLocationFromCoords] RPC error:", error);
    return null;
  }

  return (data ?? null) as ResolvedLocationRpcResult | null;
}