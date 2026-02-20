export type Job = {
  id: string;
  title: string;
  description: string | null;

  pay_type: "daily" | "weekly" | "monthly";

  location_id: string;
  employer_id: string;

  contact_method: "call" | "whatsapp" | "walk_in" | "in_app";
  contact_phone: string | null;

  is_sponsored: boolean;
  sponsored_until: string | null;

  expires_at: string;
  created_at: string;
};
