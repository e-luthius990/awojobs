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
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        auth: { persistSession: false },
      }
    );

    const { data, error: authError } = await anon.auth.getUser(token);
    if (authError || !data?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user = data.user;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response("Invalid payload", { status: 400 });
    }

    const { lat, lng, timestamp, device_hash } = body;

    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      typeof timestamp !== "number"
    ) {
      return new Response("Invalid GPS data", { status: 400 });
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response("Invalid GPS data", { status: 400 });
    }

    if (Date.now() - timestamp > MAX_GPS_AGE_MS) {
      return new Response("Stale GPS", { status: 400 });
    }

    if (typeof device_hash !== "string" || device_hash.trim().length < 32) {
      return new Response("Invalid device", { status: 400 });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: { persistSession: false },
      }
    );

    /* ---------- Rate limit ---------- */
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

    const { count, error: rateCountError } = await service
      .from("location_rate_log")
      .select("id", { count: "exact", head: true })
      .eq("device_hash", device_hash)
      .gt("created_at", oneMinuteAgo);

    if (rateCountError) {
      console.error("[update_location] rate count error:", rateCountError);
      return new Response("Rate limit check failed", { status: 500 });
    }

    if ((count ?? 0) >= DEVICE_LIMIT_PER_MIN) {
      return new Response("Rate limited", { status: 429 });
    }

    const { error: logError } = await service.from("location_rate_log").insert({
      device_hash,
      user_id: user.id,
    });

    if (logError) {
      console.error("[update_location] rate log insert error:", logError);
      return new Response("Rate log failed", { status: 500 });
    }

    /* ---------- Call live SQL RPC ---------- */
    const { error: rpcError } = await service.rpc("update_user_location", {
      p_lat: lat,
      p_lng: lng,
      p_source: "edge_gps",
    });

    if (rpcError) {
      const message = rpcError.message ?? "";

      if (
        message.includes("Location outside Uganda") ||
        message.includes("OUTSIDE_SUPPORTED_COUNTRY")
      ) {
        return new Response("Outside supported country", { status: 403 });
      }

      if (message.includes("Invalid coordinates")) {
        return new Response("Invalid coordinates", { status: 400 });
      }

      if (message.includes("Invalid location (0,0)")) {
        return new Response("Invalid location", { status: 400 });
      }

      if (message.includes("Not authenticated")) {
        return new Response("Unauthorized", { status: 401 });
      }

      if (message.includes("Profile not found")) {
        return new Response("Profile not found", { status: 404 });
      }

      console.error("[update_location] RPC error:", rpcError);
      return new Response("Location update failed", { status: 500 });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Location updated",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[update_location] unexpected error:", err);
    return new Response("Server error", { status: 500 });
  }
});