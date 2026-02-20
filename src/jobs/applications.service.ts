import { supabase } from "../core/supabase";
import { Application } from "./applications.types";

/* ---------------------------------------------
   FETCH APPLICATIONS (EMPLOYER-SCOPED)
---------------------------------------------- */
export async function fetchMyApplications(): Promise<Application[]> {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user?.id) {
    throw new Error("Not authenticated");
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
      created_at
    `)
    .eq("employer_id", user.id) // ✅ explicit scoping
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchMyApplications]", error);
    throw error;
  }

  return data ?? [];
}
