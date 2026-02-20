export type Application = {
  id: string;
  job_id: string;
  employer_id: string;

  applicant_name: string;
  applicant_phone: string;

  source: string; // "anonymous" | "in_app" | future-safe
  created_at: string;
};
