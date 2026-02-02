import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

type Cursor = {
  created_at: string;
  id: string;
};

function decodeCursor(cursor?: string): Cursor | null {
  if (!cursor) return null;
  try {
    return JSON.parse(atob(cursor));
  } catch {
    return null;
  }
}

function encodeCursor(row: { created_at: string; id: string }) {
  return btoa(
    JSON.stringify({
      created_at: row.created_at,
      id: row.id,
    }),
  );
}

serve(async (req) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const locationId = url.searchParams.get("location_id");

  if (!locationId) {
    return new Response("location_id required", { status: 400 });
  }

  const limit = Math.min(
    Number(url.searchParams.get("limit") ?? PAGE_SIZE_DEFAULT),
    PAGE_SIZE_MAX,
  );

  const cursor = decodeCursor(url.searchParams.get("cursor") ?? undefined);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let query = supabase
    .from("jobs")
    .select("*")
    .eq("location_id", locationId)
    .gt("expires_at", new Date().toISOString()) // ✅ FIX
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("jobs_feed error:", error);
    return new Response("Database error", { status: 500 });
  }

  const hasMore = data.length > limit;
  const rows = hasMore ? data.slice(0, limit) : data;

  const nextCursor = hasMore
    ? encodeCursor(rows[rows.length - 1])
    : null;

  return new Response(
    JSON.stringify({
      jobs: rows,
      nextCursor,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
});
