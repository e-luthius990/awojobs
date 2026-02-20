import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Not allowed", { status: 405 });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: auth } },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    /* ---------------- Load Premium Record ---------------- */
    const { data: premium } = await supabase
      .from("job_seeker_premium")
      .select("expires_at, status")
      .eq("user_id", user.id)
      .maybeSingle();

    const now = new Date();

    const active =
      premium &&
      premium.status === "active" &&
      new Date(premium.expires_at).getTime() > now.getTime();

    const expiresAt = active
      ? new Date(premium.expires_at)
      : null;

    const daysRemaining = active
      ? Math.ceil(
          (expiresAt!.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    return new Response(
      JSON.stringify({
        active: !!active,
        expires_at: expiresAt
          ? expiresAt.toISOString()
          : null,
        days_remaining: daysRemaining,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );

  } catch (err) {
    console.error("premium state error:", err);
    return new Response("Server error", { status: 500 });
  }
});
