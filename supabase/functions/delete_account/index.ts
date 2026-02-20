// supabase/functions/delete_account/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const token = auth.replace("Bearer ", "").trim();

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data } = await anon.auth.getUser(token);
    const user = data?.user;

    if (!user) {
      return json({ error: "invalid_session" }, 401);
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    /* ---------- CALL CENTRALIZED SQL ---------- */

    const { data: result, error } = await service.rpc(
      "delete_account",
      { p_user_id: user.id }
    );

    if (error) {
      console.error("[delete_account RPC]", error);
      return json({ error: "database_error" }, 500);
    }

    if (!result?.ok) {
      return json(
        { error: result?.error ?? "unknown_error" },
        400
      );
    }

    /* ---------- DELETE AUTH USER ---------- */

    await service.auth.admin.invalidateUserSessions(user.id);
    await service.auth.admin.deleteUser(user.id);

    return json({ ok: true });

  } catch (err) {
    console.error("[delete_account]", err);
    return json({ error: "internal_error" }, 500);
  }
});
