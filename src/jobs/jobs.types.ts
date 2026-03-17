export type JobStatus =
  | "draft"
  | "pending_payment"
  | "active"
  | "expired"
  | "closed";

export type Job = {
  id: string;
  employer_id: string;

  title: string;
  description: string | null;

  pay_type: "daily" | "weekly" | "monthly" | "not_specified";

  location_id: string | null;

  contact_method: "call" | "whatsapp" | "walk_in" | "in_app";
  contact_phone: string | null;

  status: JobStatus;

  is_sponsored: boolean;
  sponsored_until: string | null;
  is_currently_sponsored: boolean;

  expires_at: string | null;

  views_count: number;
  applications_count: number;

  created_at: string;
};