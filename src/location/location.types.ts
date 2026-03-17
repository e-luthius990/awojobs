export type ResolvedLocation = {
  source: "gps" | "manual";
  location_id: string | null;
  district: string | null;
  town: string | null;
  sub_county: string | null;
  lat: number | null;
  lng: number | null;
  resolved_at: number;
};