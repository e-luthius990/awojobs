import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_GPS_AGE_MS = 120000;
const DEVICE_LIMIT_PER_MIN = 30;

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data } = await anon.auth.getUser(token);
    const user = data?.user;

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return new Response("Invalid payload", { status: 400 });

    const { lat, lng, timestamp, device_hash } = body;

    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      typeof timestamp !== "number"
    ) {
      return new Response("Invalid GPS data", { status: 400 });
    }

    if (Date.now() - timestamp > MAX_GPS_AGE_MS) {
      return new Response("Stale GPS", { status: 400 });
    }

    if (!device_hash || device_hash.length < 32) {
      return new Response("Invalid device", { status: 400 });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    /* ---------- Rate Limit ---------- */
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

    const { count } = await service
      .from("location_rate_log")
      .select("id", { count: "exact", head: true })
      .eq("device_hash", device_hash)
      .gt("created_at", oneMinuteAgo);

    if ((count ?? 0) >= DEVICE_LIMIT_PER_MIN) {
      return new Response("Rate limited", { status: 429 });
    }

    await service.from("location_rate_log").insert({
      device_hash,
      user_id: user.id,
    });

    /* ---------- Call Central SQL ---------- */
    const { data: result, error } = await service.rpc(
      "update_user_location",
      {
        p_user_id: user.id,
        p_lat: lat,
        p_lng: lng,
        p_device_hash: device_hash,
        p_client_timestamp: timestamp,
      }
    );

    if (error) {
      if (error.message.includes("OUTSIDE_SUPPORTED_COUNTRY"))
        return new Response("Outside supported country", { status: 403 });

      if (error.message.includes("IMPOSSIBLE_MOVEMENT"))
        return new Response("Impossible movement detected", { status: 403 });

      console.error("RPC error:", error);
      return new Response("Location update failed", { status: 500 });
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[update_location]", err);
    return new Response("Server error", { status: 500 });
  }
});
