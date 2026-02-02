import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  /* ---------------------------------------------
     Verify session token
  ---------------------------------------------- */
  const { data: auth, error } = await supabase.auth.getUser(token);

  if (error || !auth?.user?.id) {
    return new Response("Invalid token", { status: 401 });
  }

  const userId = auth.user.id;

  /* ---------------------------------------------
     Delete user-owned data (ORDER MATTERS)
  ---------------------------------------------- */

  // 1️⃣ Jobs
  await supabase
    .from("jobs")
    .delete()
    .eq("created_by", userId);

  // 2️⃣ Push logs (optional but clean)
  await supabase
    .from("push_notify_log")
    .delete()
    .eq("requester_id", userId);

  // 3️⃣ OTPs
  await supabase
    .from("otp_codes")
    .delete()
    .eq("phone_number", auth.user.phone);

  // 4️⃣ Profile
  await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  /* ---------------------------------------------
     Revoke sessions + delete auth user
  ---------------------------------------------- */
  await supabase.auth.admin.invalidateUserSessions(userId);
  await supabase.auth.admin.deleteUser(userId);

  return new Response(
    JSON.stringify({ deleted: true }),
    { headers: { "Content-Type": "application/json" } }
  );
});
