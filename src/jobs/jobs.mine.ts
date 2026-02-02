import { supabase } from "../core/supabase";
import { Job } from "./jobs.types";

export async function fetchMyJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Job[];
}

export async function deleteJob(jobId: string) {
  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId);

  if (error) throw error;
}
