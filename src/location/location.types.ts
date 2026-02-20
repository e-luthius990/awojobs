export type ResolvedLocation = {
  source: "gps" | "manual";
  location_id: string;
  lat: number | null;
  lng: number | null;
  resolved_at: number;
};
