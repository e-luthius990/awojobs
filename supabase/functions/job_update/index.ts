// supabase/functions/job_update/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function isUUID(id: string) {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    /* =====================================================
       AUTH
    ===================================================== */

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

    /* =====================================================
       INPUT VALIDATION (STRUCTURE ONLY)
       Business rules handled in SQL
    ===================================================== */

    const body = await req.json().catch(() => null);

    if (!body?.job_id || !body?.update) {
      return new Response("Invalid payload", { status: 400 });
    }

    const { job_id, update } = body;

    if (!isUUID(job_id)) {
      return new Response("Invalid job_id", { status: 400 });
    }

    if (
      typeof update.title !== "string" ||
      typeof update.pay_type !== "string" ||
      typeof update.contact_method !== "string" ||
      !update.expires_at
    ) {
      return new Response("Invalid update data", { status: 400 });
    }

    /* =====================================================
       CALL CENTRALIZED SQL ENGINE
    ===================================================== */

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: result, error } = await supabase.rpc(
      "manage_job_update",
      {
        p_job_id: job_id,
        p_actor_id: user.id,
        p_title: update.title,
        p_description: update.description ?? null,
        p_pay_type: update.pay_type,
        p_contact_method: update.contact_method,
        p_contact_phone: update.contact_phone ?? null,
        p_expires_at: update.expires_at,
      }
    );

    if (error) {
      console.error("Update RPC error:", error.message);
      return new Response(error.message, { status: 400 });
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Job update error:", err);
    return new Response("Server error", { status: 500 });
  }
});
