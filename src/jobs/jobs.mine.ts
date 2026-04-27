import { supabase } from "../core/supabase";
import { Job } from "./jobs.types";

/* ---------------------------------------------
   FETCH MY JOBS (RLS OWNERSHIP ENFORCED)
---------------------------------------------- */
export async function fetchMyJobs(): Promise<Job[]> {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user?.id) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("jobs")
    .select(`
      id,
      employer_id,
      title,
      description,
      pay_type,
      location_id,
      district_id,
      contact_method,
      contact_phone,
      status,
      is_sponsored,
      sponsored_until,
      expires_at,
      posting_resolution_level,
      posting_display_label,
      posting_latitude,
      posting_longitude,
      posting_accuracy_meters,
      posted_from_device_at,
      created_at,
      views_count,
      applications_count
    `)
    .eq("employer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchMyJobs error:", error);
    throw error;
  }

  const rows = (data ?? []) as Array<Omit<Job, "is_currently_sponsored">>;

  const now = Date.now();

  return rows.map((job) => ({
    ...job,
    is_currently_sponsored:
      Boolean(job.is_sponsored) &&
      Boolean(job.sponsored_until) &&
      !Number.isNaN(Date.parse(job.sponsored_until!)) &&
      Date.parse(job.sponsored_until!) > now,
  })) as Job[];
}

/* ---------------------------------------------
   DELETE JOB (RLS OWNERSHIP ENFORCED)
---------------------------------------------- */

export async function deleteJob(jobId: string) {
  const normalizedJobId = typeof jobId === "string" ? jobId.trim() : "";

  if (!normalizedJobId) {
    throw new Error("Missing job id");
  }

  const { data, error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", normalizedJobId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Job not found or permission denied");
  }

  return true;
}