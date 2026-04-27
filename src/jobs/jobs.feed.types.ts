export type FeedJob = {
  id: string;
  title: string;
  description: string | null;

  pay_type: "daily" | "weekly" | "monthly" | "not_specified" | string | null;

  location_id: string | null;
  district_id: string | null;

  contact_method: "call" | "whatsapp" | "walk_in" | "in_app" | null;
  contact_phone: string | null;

  is_sponsored: boolean;
  sponsored_until: string | null;
  is_currently_sponsored: boolean;

  expires_at: string | null;
  created_at: string;

  posting_display_label: string | null;
  lat: number | null;
  lng: number | null;
};