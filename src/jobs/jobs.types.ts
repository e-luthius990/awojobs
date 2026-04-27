export type JobStatus =
  | "draft"
  | "pending_payment"
  | "active"
  | "expired"
  | "closed"
  | "flagged"
  | "deleted";

export type PostingResolutionLevel =
  | "exact_local"
  | "area_local"
  | "district_only"
  | "uganda_only"
  | "outside_uganda"
  | null;

export type MapVisibilityMode =
  | "exact_pin"
  | "offset_pin"
  | "area_circle"
  | "district_anchor"
  | "hidden"
  | null;

export type GeoStatus =
  | "validated"
  | "backfilled_legacy"
  | "weak_accuracy"
  | "stale"
  | "outside_supported_country"
  | "rejected"
  | null;

export type Job = {
  id: string;
  employer_id: string;

  title: string;
  description: string | null;

  pay_type: "daily" | "weekly" | "monthly" | "not_specified" | null;

  location_id: string | null;
  district_id: string | null;

  contact_method: "call" | "whatsapp" | "walk_in" | "in_app" | null;
  contact_phone: string | null;

  status: JobStatus;

  is_sponsored: boolean;
  sponsored_until: string | null;
  is_currently_sponsored: boolean;

  expires_at: string | null;

  posting_resolution_level: PostingResolutionLevel;
  posting_display_label: string | null;
  posting_latitude: number | null;
  posting_longitude: number | null;
  posting_accuracy_meters: number | null;
  posted_from_device_at: string | null;

  posting_resolution_confidence: number | null;
  approximate_area_radius_meters: number | null;
  map_visibility_mode: MapVisibilityMode;
  geo_status: GeoStatus;

  views_count?: number;
  applications_count?: number;

  created_at: string;
};

export type JobWithCoords = Job & {
  lat: number | null;
  lng: number | null;
};