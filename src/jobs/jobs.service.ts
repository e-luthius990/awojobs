import { supabase } from "../core/supabase";
import { Job } from "./jobs.types";
import { JobsCursor } from "./jobs.cursor";

export type JobsPage = {
  jobs: Job[];
  nextCursor: JobsCursor | null;
};

export async function fetchJobsForLocationCursor(
  locationId: string,
  cursor?: JobsCursor | null,
  limit = 20
): Promise<JobsPage> {
  let query = supabase
    .from("jobs")
    .select("*")
    .eq("location_id", locationId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1); // fetch extra to detect next page

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
    );
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data || data.length === 0) {
    return { jobs: [], nextCursor: null };
  }

  const hasMore = data.length > limit;
  const rows = hasMore ? data.slice(0, limit) : data;

  const last = rows[rows.length - 1];

  return {
    jobs: rows as Job[],
    nextCursor: hasMore
      ? { created_at: last.created_at, id: last.id }
      : null,
  };
}
