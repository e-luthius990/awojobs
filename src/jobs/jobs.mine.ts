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
      title,
      description,
      pay_type,
      location_id,
      employer_id,
      contact_method,
      contact_phone,
      status,
      is_sponsored,
      sponsored_until,
      expires_at,
      created_at,
      views_count,
      applications_count
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchMyJobs error:", error);
    throw error;
  }

  return (data ?? []) as Job[];
}

/* ---------------------------------------------
   DELETE JOB (RLS OWNERSHIP ENFORCED)
---------------------------------------------- */

export async function deleteJob(jobId: string) {
  const { data, error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
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