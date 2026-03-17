export type ApplicationStatus =
  | "pending"
  | "reviewed"
  | "shortlisted"
  | "rejected"
  | "hired";

export interface Application {
  id: string;
  job_id: string;
  applicant_name: string;
  applicant_phone: string;
  source: string | null;
  created_at: string;
  status: ApplicationStatus;

  job: {
    id: string;
    title: string;
    status: string;
    expires_at: string | null;
    is_sponsored: boolean | null;
  };
}