// supabase/functions/apply_to_job/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =====================================================
   RATE LIMIT CONFIG
===================================================== */

const DEVICE_LIMIT_PER_MIN = 10;
const USER_LIMIT_PER_MIN = 20;

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

async function getUserFromJWT(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data } = await supabaseAnon.auth.getUser(token);
  return data?.user ?? null;
}

async function enforceRateLimit(
  service: any,
  user_id: string,
  device_hash: string,
  ip: string
) {
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

  const { count: userCount } = await service
    .from("application_rate_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user_id)
    .gt("created_at", oneMinuteAgo);

  if ((userCount ?? 0) >= USER_LIMIT_PER_MIN) {
    throw new Error("rate_limit_user");
  }

  const { count: deviceCount } = await service
    .from("application_rate_log")
    .select("id", { count: "exact", head: true })
    .eq("device_hash", device_hash)
    .gt("created_at", oneMinuteAgo);

  if ((deviceCount ?? 0) >= DEVICE_LIMIT_PER_MIN) {
    throw new Error("rate_limit_device");
  }

  await service.from("application_rate_log").insert({
    user_id,
    device_hash,
    ip,
  });
}

/* =====================================================
   MAIN
===================================================== */

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    const body = await req.json().catch(() => null);
    if (!body?.job_id || !body?.device_hash) {
      return json({ error: "invalid_payload" }, 400);
    }

    const { job_id, device_hash } = body;

    if (typeof device_hash !== "string" || device_hash.length < 32) {
      return json({ error: "invalid_device_hash" }, 400);
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    /* ---------------- AUTH ---------------- */

    const user = await getUserFromJWT(req);
    if (!user) {
      return json({ error: "unauthorized" }, 401);
    }

    /* ---------------- SERVICE CLIENT ---------------- */

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    /* ---------------- RATE LIMIT ---------------- */

    try {
      await enforceRateLimit(service, user.id, device_hash, ip);
    } catch (err: any) {
      return json(
        { error: err.message ?? "rate_limited" },
        429
      );
    }

    /* ---------------- CALL CENTRALIZED SQL ---------------- */

    const { data, error } = await service.rpc("apply_to_job", {
      p_user_id: user.id,
      p_job_id: job_id,
      p_device_hash: device_hash,
    });

    if (error) {
      console.error("[apply_to_job RPC error]", error);
      return json({ error: "database_error" }, 500);
    }

    /*
       SQL returns structured JSON:
       { ok: true }
       { ok: false, error: "..." }
    */

    if (!data?.ok) {
      return json(
        { error: data?.error ?? "unknown_error" },
        400
      );
    }

    return json({ ok: true });

  } catch (err) {
    console.error("[apply_to_job]", err);
    return json({ error: "internal_error" }, 500);
  }
});
