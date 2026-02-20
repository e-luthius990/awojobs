import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function sha256(input: string) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );

  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { phone, token, new_password } = await req.json();

    if (!new_password || new_password.length < 8) {
      return Response.json(
        { error: "Weak password" },
        { status: 400 }
      );
    }

    const { data: user } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone_number", phone)
      .maybeSingle();

    if (!user) {
      return Response.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const tokenHash = await sha256(token);

    const { data: record } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("token_hash", tokenHash)
      .eq("used", false)
      .maybeSingle();

    if (!record || new Date(record.expires_at) < new Date()) {
      return Response.json(
        { error: "Invalid or expired code" },
        { status: 400 }
      );
    }

    await supabase.auth.admin.updateUserById(user.id, {
      password: new_password,
    });

    await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("id", record.id);

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Reset failed" },
      { status: 400 }
    );
  }
});
