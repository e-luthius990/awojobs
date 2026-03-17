import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.rpc("expire_jobs");

  if (error) {
    console.error("Expire jobs error:", error);
    return new Response("Error", { status: 500 });
  }

  return new Response("OK");
});