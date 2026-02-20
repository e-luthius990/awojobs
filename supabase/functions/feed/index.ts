// supabase/functions/feed/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

const DEVICE_LIMIT_PER_MIN = 60;
const IP_LIMIT_PER_MIN = 120;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function isValidUUID(id: string) {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

/* ---------------- JWT Extract ---------------- */

async function getUserFromJWT(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data } = await supabaseAnon.auth.getUser(token);
  return data?.user ?? null;
}

/* ---------------- Rate Limiter ---------------- */

async function enforceRateLimit(
  supabase: any,
  ip: string,
  device_hash: string
) {
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

  const { count: deviceCount } = await supabase
    .from("feed_rate_log")
    .select("id", { count: "exact", head: true })
    .eq("device_hash", device_hash)
    .gt("created_at", oneMinuteAgo);

  if ((deviceCount ?? 0) >= DEVICE_LIMIT_PER_MIN) {
    throw new Error("rate_limit_device");
  }

  const { count: ipCount } = await supabase
    .from("feed_rate_log")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gt("created_at", oneMinuteAgo);

  if ((ipCount ?? 0) >= IP_LIMIT_PER_MIN) {
    throw new Error("rate_limit_ip");
  }

  await supabase.from("feed_rate_log").insert({
    ip,
    device_hash,
  });
}

/* ---------------- Main ---------------- */

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "invalid_json" }, 400);

    const {
      location_id,
      device_hash,
      limit,
      cursor_created_at,
      cursor_id,
      requested_scope,
    } = body;

    if (!device_hash || device_hash.length < 32) {
      return json({ error: "invalid_device_hash" }, 400);
    }

    if (!location_id || !isValidUUID(location_id)) {
      return json({ error: "invalid_location_id" }, 400);
    }

    const pageSize =
      typeof limit === "number"
        ? Math.min(Math.max(limit, 1), PAGE_SIZE_MAX)
        : PAGE_SIZE_DEFAULT;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    /* ---------------- Rate Limit ---------------- */

    try {
      await enforceRateLimit(service, ip, device_hash);
    } catch (err: any) {
      return json({ error: err.message }, 429);
    }

    /* ---------------- Optional User ---------------- */

    const user = await getUserFromJWT(req);

    /* ---------------- Strict Uganda Lock ---------------- */

    const { data: locationRow } = await service
      .from("locations")
      .select("id, country_norm")
      .eq("id", location_id)
      .single();

    if (!locationRow || locationRow.country_norm !== "uganda") {
      return json({ error: "invalid_uganda_location" }, 400);
    }

    /* ---------------- Call Unified SQL Feed ---------------- */

    const { data, error } = await service.rpc("get_feed", {
      p_user_id: user?.id ?? null,
      p_location_id: location_id,
      p_requested_scope: requested_scope ?? "local",
      p_limit: pageSize,
      p_cursor_created_at: cursor_created_at ?? null,
      p_cursor_id: cursor_id ?? null,
    });

    if (error) {
      console.error("[get_feed RPC]", error);
      return json({ error: "database_error" }, 500);
    }

    return json(data ?? {
      premium: {
        active: false,
        expires_at: null,
        days_remaining: 0,
        scope: "local",
        requested_scope: "local",
        can_access_national: false,
        phone: null,
      },
      jobs: [],
    });

  } catch (err) {
    console.error("[feed]", err);
    return json({ error: "internal_error" }, 500);
  }
});
