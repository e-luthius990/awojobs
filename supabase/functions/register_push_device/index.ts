// supabase/functions/register_push_device/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------------------------------------------
   HELPERS
---------------------------------------------- */

function getIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

function isValidPlatform(p: unknown): p is "android" | "ios" {
  return p === "android" || p === "ios";
}

function isValidExpoToken(t: unknown): t is string {
  return (
    typeof t === "string" &&
    (t.startsWith("ExponentPushToken[") ||
      t.startsWith("ExpoPushToken["))
  );
}

/* ---------------------------------------------
   MAIN
---------------------------------------------- */

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    /* ---------------- AUTH ---------------- */

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      }
    );

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    /* ---------------- PAYLOAD ---------------- */

    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response("Invalid JSON", { status: 400 });
    }

    const {
      expo_push_token,
      location_id,
      platform,
      device_hash,
    } = body;

    if (!isValidExpoToken(expo_push_token)) {
      return new Response("Invalid push token", { status: 400 });
    }

    if (!isValidPlatform(platform)) {
      return new Response("Invalid platform", { status: 400 });
    }

    if (!device_hash || typeof device_hash !== "string") {
      return new Response("Invalid device_hash", { status: 400 });
    }

    /* ---------------- CALL SQL RPC ---------------- */

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const ip = getIp(req);

    const { error } = await supabaseService.rpc(
      "register_push_device",
      {
        p_user_id: user.id,
        p_expo_push_token: expo_push_token,
        p_location_id: location_id ?? null,
        p_platform: platform,
        p_device_hash: device_hash,
        p_ip: ip,
      }
    );

    if (error) {
      console.error("[register_push_device]", error);
      return new Response("Registration failed", { status: 400 });
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[register_push_device]", err);
    return new Response("Server error", { status: 500 });
  }
});
