export type FeedJob = {
  id: string;
  title: string;
  description: string | null;

  pay_type: "daily" | "weekly" | "monthly" | "not_specified" | string;

  location_id: string;

  contact_method: "call" | "whatsapp" | "walk_in" | "in_app";
  contact_phone: string | null;

  is_sponsored: boolean;
  sponsored_until: string | null;
  is_currently_sponsored: boolean;

  expires_at: string | null;
  created_at: string;
};