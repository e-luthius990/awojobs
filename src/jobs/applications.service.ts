import { supabase } from "../core/supabase";
import { Application } from "./applications.types";

/* ---------------------------------------------
   FETCH APPLICATIONS (EMPLOYER-SCOPED, RLS SAFE)
---------------------------------------------- */
export async function fetchMyApplications(
  limit = 50
): Promise<Application[]> {
  const pageSize = Math.min(Math.max(limit, 1), 100);

  const { data, error } = await supabase
    .from("applications")
    .select(`
      id,
      job_id,
      applicant_name,
      applicant_phone,
      source,
      created_at,
      status,
      job:jobs!inner (
        id,
        title,
        status,
        expires_at,
        is_sponsored
      )
    `)
    .order("created_at", { ascending: false })
    .limit(pageSize);

  if (error) {
    console.error("[fetchMyApplications]", error);
    throw error;
  }

  return (data ?? []) as Application[];
}