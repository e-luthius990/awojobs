export type Job = {
  id: string;
  title: string;
  description: string | null;

  pay_type: "daily" | "weekly" | "monthly";

  location_id: string;
  employer_id: string;

  contact_method: "call" | "whatsapp" | "walk_in";
  contact_phone: string;

  expires_at: string;
  created_at: string;
};
