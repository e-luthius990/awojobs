// supabase/functions/job_lifecycle/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ACTIONS = [
  "delete",
  "close",
  "expire",
] as const;

function isUUID(id: string) {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    /* ================= AUTH ================= */

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data } = await supabaseAnon.auth.getUser(token);
    const user = data?.user;

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    /* ================= INPUT ================= */

    const body = await req.json().catch(() => null);

    if (!body?.job_id || !body?.action) {
      return new Response("Invalid payload", { status: 400 });
    }

    const { job_id, action } = body;

    if (!isUUID(job_id)) {
      return new Response("Invalid job_id", { status: 400 });
    }

    if (!ALLOWED_ACTIONS.includes(action)) {
      return new Response("Invalid action", { status: 400 });
    }

    /* ================= CALL RPC ================= */

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: result, error } = await supabase.rpc(
      "manage_job_lifecycle",
      {
        p_job_id: job_id,
        p_action: action,
        p_actor_id: user.id,
      }
    );

    if (error) {
      console.error("Lifecycle RPC error:", error.message);
      return new Response(error.message, { status: 400 });
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Lifecycle error:", err);
    return new Response("Server error", { status: 500 });
  }
});
