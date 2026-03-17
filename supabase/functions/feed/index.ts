import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =====================================================
   CONFIG
===================================================== */

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

const DEVICE_LIMIT_PER_MIN = 60;
const IP_LIMIT_PER_MIN = 120;

/* =====================================================
   HELPERS
===================================================== */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidUUID(id: string) {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

function normalizeIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();

  if (first && first.length <= 128) {
    return first;
  }

  return "unknown";
}

function normalizeLimit(limit: unknown) {
  const raw =
    typeof limit === "number"
      ? limit
      : typeof limit === "string" && limit.trim() !== ""
        ? Number(limit)
        : PAGE_SIZE_DEFAULT;

  if (!Number.isFinite(raw)) {
    return PAGE_SIZE_DEFAULT;
  }

  return Math.min(Math.max(Math.trunc(raw), 1), PAGE_SIZE_MAX);
}

/* =====================================================
   JWT EXTRACT
===================================================== */

async function getUserFromJWT(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      auth: { persistSession: false },
    },
  );

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error) return null;

  return data?.user ?? null;
}

/* =====================================================
   RATE LIMIT
===================================================== */

type RateLimitResult =
  | { ok: true }
  | { ok: false; code: "rate_limit_device" | "rate_limit_ip"; status: 429 }
  | {
      ok: false;
      code:
        | "rate_limit_device_check_failed"
        | "rate_limit_ip_check_failed"
        | "rate_limit_log_failed";
      status: 500;
    };

async function enforceRateLimit(
  supabase: ReturnType<typeof createClient>,
  ip: string,
  device_hash: string,
): Promise<RateLimitResult> {
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

  const { count: deviceCount, error: deviceError } = await supabase
    .from("feed_rate_log")
    .select("id", { count: "exact", head: true })
    .eq("device_hash", device_hash)
    .gt("created_at", oneMinuteAgo);

  if (deviceError) {
    return {
      ok: false,
      code: "rate_limit_device_check_failed",
      status: 500,
    };
  }

  if ((deviceCount ?? 0) >= DEVICE_LIMIT_PER_MIN) {
    return {
      ok: false,
      code: "rate_limit_device",
      status: 429,
    };
  }

  const { count: ipCount, error: ipError } = await supabase
    .from("feed_rate_log")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gt("created_at", oneMinuteAgo);

  if (ipError) {
    return {
      ok: false,
      code: "rate_limit_ip_check_failed",
      status: 500,
    };
  }

  if ((ipCount ?? 0) >= IP_LIMIT_PER_MIN) {
    return {
      ok: false,
      code: "rate_limit_ip",
      status: 429,
    };
  }

  const { error: insertError } = await supabase.from("feed_rate_log").insert({
    ip,
    device_hash,
  });

  if (insertError) {
    return {
      ok: false,
      code: "rate_limit_log_failed",
      status: 500,
    };
  }

  return { ok: true };
}

/* =====================================================
   MAIN
===================================================== */

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    const ip = normalizeIp(req);

    const parsed = await req.json().catch(() => null);
    if (!isPlainObject(parsed)) {
      return json({ error: "invalid_json" }, 400);
    }

    const {
      location_id,
      device_hash,
      limit,
      cursor_is_currently_sponsored,
      cursor_sponsored_until,
      cursor_created_at,
      cursor_id,
      requested_scope,
    } = parsed;

    /* ---------------- Device Hash Validation ---------------- */

    if (
      !device_hash ||
      typeof device_hash !== "string" ||
      !/^[a-f0-9]{64}$/i.test(device_hash)
    ) {
      return json({ error: "invalid_device_hash" }, 400);
    }

    /* ---------------- Scope Clamp ---------------- */

    const safeScope: "local" | "national" =
      requested_scope === "national" ? "national" : "local";

    const needsLocation = safeScope === "local";

    /* ---------------- Location Validation ---------------- */

    let safeLocationId: string | null = null;

    if (needsLocation) {
      if (
        !location_id ||
        typeof location_id !== "string" ||
        !isValidUUID(location_id)
      ) {
        return json({ error: "invalid_location_id" }, 400);
      }

      safeLocationId = location_id;
    } else {
      if (location_id !== null && location_id !== undefined) {
        if (typeof location_id !== "string" || !isValidUUID(location_id)) {
          return json({ error: "invalid_location_id" }, 400);
        }
      }

      safeLocationId = null;
    }

    /* ---------------- Cursor Validation ---------------- */

    let safeCursorIsCurrentlySponsored: boolean | null = null;
    let safeCursorSponsoredUntil: string | null = null;
    let safeCursorCreatedAt: string | null = null;
    let safeCursorId: string | null = null;

    const hasAnyCursor =
      cursor_is_currently_sponsored !== undefined ||
      cursor_sponsored_until !== undefined ||
      cursor_created_at !== undefined ||
      cursor_id !== undefined;

    if (hasAnyCursor) {
      const sponsoredOk =
        typeof cursor_is_currently_sponsored === "boolean";

      const sponsoredUntilOk =
        cursor_sponsored_until === null ||
        cursor_sponsored_until === undefined ||
        (typeof cursor_sponsored_until === "string" &&
          !Number.isNaN(Date.parse(cursor_sponsored_until)));

      const createdAtOk =
        typeof cursor_created_at === "string" &&
        !Number.isNaN(Date.parse(cursor_created_at));

      const idOk =
        typeof cursor_id === "string" &&
        isValidUUID(cursor_id);

      if (!sponsoredOk || !sponsoredUntilOk || !createdAtOk || !idOk) {
        return json({ error: "invalid_cursor" }, 400);
      }

      if (
        cursor_is_currently_sponsored === false &&
        cursor_sponsored_until !== null &&
        cursor_sponsored_until !== undefined
      ) {
        return json({ error: "invalid_cursor" }, 400);
      }

      safeCursorIsCurrentlySponsored = cursor_is_currently_sponsored;
      safeCursorSponsoredUntil = cursor_sponsored_until ?? null;
      safeCursorCreatedAt = cursor_created_at;
      safeCursorId = cursor_id;
    }

    /* ---------------- Page Size Clamp ---------------- */

    const pageSize = normalizeLimit(limit);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: { persistSession: false },
      },
    );

    /* ---------------- Rate Limit ---------------- */

    const rateLimit = await enforceRateLimit(service, ip, device_hash);
    if (!rateLimit.ok) {
      return json({ error: rateLimit.code }, rateLimit.status);
    }

    /* ---------------- Optional Auth ---------------- */

    const user = await getUserFromJWT(req);

    /* ---------------- Strict Uganda Lock (local only) ---------------- */

    if (needsLocation && safeLocationId) {
      const { data: locationRow, error: locationError } = await service
        .from("locations")
        .select("country_norm")
        .eq("id", safeLocationId)
        .single();

      if (locationError) {
        return json({ error: "invalid_location_id" }, 400);
      }

      if (!locationRow || locationRow.country_norm !== "uganda") {
        return json({ error: "invalid_uganda_location" }, 400);
      }
    }

    /* ---------------- Call SQL Feed ---------------- */

    const { data, error } = await service.rpc("get_feed", {
      p_user_id: user?.id ?? null,
      p_location_id: safeLocationId,
      p_requested_scope: safeScope,
      p_limit: pageSize,
      p_cursor_is_currently_sponsored: safeCursorIsCurrentlySponsored,
      p_cursor_sponsored_until: safeCursorSponsoredUntil,
      p_cursor_created_at: safeCursorCreatedAt,
      p_cursor_id: safeCursorId,
    });

    if (error) {
      console.error("[get_feed RPC]", {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return json({ error: "database_error" }, 500);
    }

    if (!data) {
      return json({
        premium: {
          active: false,
          scope: safeScope,
          requested_scope: safeScope,
          can_access_national: false,
        },
        jobs: [],
        nextCursor: null,
        new_jobs_count: 0,
      });
    }

    return json(data);
  } catch (err) {
    console.error("[feed]", err);
    return json({ error: "internal_error" }, 500);
  }
});