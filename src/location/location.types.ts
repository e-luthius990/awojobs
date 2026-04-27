export type ResolutionLevel =
  | "exact_local"
  | "area_local"
  | "district_only"
  | "uganda_only"
  | "outside_uganda";

export type CanonicalSource =
  | "live_gps"
  | "live_fused"
  | "last_known_gps"
  | "last_known_fused"
  | "cached_canonical";

export type CanonicalResolvedLocation = {
  source: CanonicalSource;
  lat: number;
  lng: number;
  accuracy_meters: number | null;
  resolved_at: number;

  is_within_uganda: boolean;
  resolution_level: ResolutionLevel;

  location_id: string | null;
  district_id: string | null;

  district_name: string | null;
  town_name: string | null;
  sub_county_name: string | null;
  display_label: string | null;

  distance_meters: number | null;
  resolution_confidence: number | null;
  approximate_area_radius_meters: number | null;

  is_precise: boolean;
  is_fallback: boolean;
};

export type ResolvedLocation = CanonicalResolvedLocation;