import { supabase } from "../core/supabase";
import { Application } from "./applications.types";

export async function fetchMyApplications(
  limit = 50,
): Promise<Application[]> {
  const pageSize = Math.min(Math.max(limit, 1), 100);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw authError ?? new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("applications")
    .select(`
      id,
      job_id,
      employer_id,
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
    .eq("employer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(pageSize);

  if (error) {
    console.error("[fetchMyApplications]", error);
    throw error;
  }

  return (data ?? []) as Application[];
}