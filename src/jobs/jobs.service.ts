import { supabaseAnon } from "../core/supabaseAnon";
import { ENV } from "../env";
import { JobWithCoords } from "./jobs.types";
import { JobsCursor } from "./jobs.cursor";

export type JobsPage = {
  jobs: JobWithCoords[];
  nextCursor: JobsCursor | null;
};

export async function fetchFeedCursor(
  locationId: string,
  cursor?: JobsCursor | null,
  limit = 20,
): Promise<JobsPage> {
  const session = await supabaseAnon.auth.getSession();
  const token = session.data.session?.access_token;

  const res = await fetch(
    `${ENV.SUPABASE_URL}/functions/v1/feed`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        location_id: locationId,
        limit,
        cursor_created_at: cursor?.created_at ?? null,
        cursor_id: cursor?.id ?? null,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  const data = await res.json();

  const jobs: JobWithCoords[] = (data.jobs ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    pay_type: row.pay_type,
    location_id: row.location_id,
    contact_method: row.contact_method,
    created_at: row.created_at,
    lat: null,
    lng: null,
  }));

  const last = jobs[jobs.length - 1];

  return {
    jobs,
    nextCursor: last
      ? { created_at: last.created_at, id: last.id }
      : null,
  };
}
