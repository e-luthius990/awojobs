export type ResolvedLocation = {
  location_id: string;
  country: string;
  district: string;
  town: string;
  sub_county: string;

  lat: number;
  lng: number;

  source: "gps" | "manual";
  resolved_at: number;
};
