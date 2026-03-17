import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("phone_otp_registrations")
      .delete()
      .lt("expires_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error("Cleanup error:", error.message);
      return new Response("Cleanup failed", { status: 500 });
    }

    return new Response("Cleanup successful", { status: 200 });
  } catch (err) {
    console.error("Unexpected cleanup failure:", err);
    return new Response("Internal error", { status: 500 });
  }
});