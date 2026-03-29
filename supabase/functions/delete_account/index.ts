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

    const token = auth.slice("Bearer ".length).trim();
    if (!token) {
      return json({ error: "unauthorized" }, 401);
    }

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: authData, error: authError } = await anon.auth.getUser(token);
    if (authError || !authData?.user) {
      return json({ error: "invalid_session" }, 401);
    }

    const user = authData.user;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[delete_account profile]", profileError);
      return json({ error: "profile_lookup_failed" }, 500);
    }

    if (!profile) {
      return json({ error: "profile_not_found" }, 404);
    }

    if (profile.role === "job_seeker") {
      const { data: result, error: rpcError } = await service.rpc(
        "delete_job_seeker_account",
        { p_user_id: user.id }
      );

      if (rpcError) {
        console.error("[delete_job_seeker_account RPC]", rpcError);
        return json({ error: "database_error" }, 500);
      }

      if (!result?.ok) {
        return json({ error: result?.error ?? "unknown_error" }, 400);
      }

      const { error: invalidateError } =
        await service.auth.admin.invalidateUserSessions(user.id);

      if (invalidateError) {
        console.error("[invalidate sessions]", invalidateError);
        return json({ error: "invalidate_sessions_failed" }, 500);
      }

      const { error: deleteUserError } =
        await service.auth.admin.deleteUser(user.id);

      if (deleteUserError) {
        console.error("[delete auth user]", deleteUserError);
        return json({ error: "delete_auth_user_failed" }, 500);
      }

      return json({ ok: true, action: "deleted" });
    }

    if (profile.role === "employer") {
      const { data: result, error: rpcError } = await service.rpc(
        "close_employer_account",
        { p_user_id: user.id }
      );

      if (rpcError) {
        console.error("[close_employer_account RPC]", rpcError);
        return json({ error: "database_error" }, 500);
      }

      if (!result?.ok) {
        return json({ error: result?.error ?? "unknown_error" }, 400);
      }

      const { error: invalidateError } =
        await service.auth.admin.invalidateUserSessions(user.id);

      if (invalidateError) {
        console.error("[invalidate sessions]", invalidateError);
        return json({ error: "invalidate_sessions_failed" }, 500);
      }

      const { error: deleteUserError } =
        await service.auth.admin.deleteUser(user.id);

      if (deleteUserError) {
        console.error("[delete auth user]", deleteUserError);
        return json({ error: "delete_auth_user_failed" }, 500);
      }

      return json({ ok: true, action: "closed" });
    }

    if (profile.role === "moderator" || profile.role === "super_admin") {
      return json({ error: "role_not_deletable" }, 403);
    }

    return json({ error: "unsupported_role" }, 400);
  } catch (err) {
    console.error("[delete_account]", err);
    return json({ error: "internal_error" }, 500);
  }
});