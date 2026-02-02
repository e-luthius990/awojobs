import { supabase } from "../core/supabase";
import { validateJob } from "./jobs.validation";
import { ENV } from "../core/config";

export async function postJob(params: {
  title: string;
  description?: string;
  pay_type: "daily" | "weekly" | "monthly";
  contact_method: "call" | "whatsapp" | "walk_in";
  contact_phone: string;
  expires_at: Date;
  location_id: string;
  urgent?: boolean;
}) {
  validateJob(params);

  /* ---------------------------------------------
     AUTH SAFETY CHECK
  ---------------------------------------------- */
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.id) {
    throw new Error("You must be logged in to post a job.");
  }

  /* ---------------------------------------------
     ACTIVE JOB LIMIT (HARD DB GUARDRAIL)
     Uses: can_post_job(employer_id, limit)
  ---------------------------------------------- */
  const { data: canPost, error: limitErr } = await supabase.rpc(
    "can_post_job",
    {
      p_employer: user.id,
      p_limit: 3, // business rule (change if needed)
    }
  );

  if (limitErr) {
    console.error("Job limit check failed:", limitErr);
    throw new Error("Unable to verify job limit. Please try again.");
  }

  if (!canPost) {
    throw new Error(
      "You already have 3 active jobs. Please delete or wait for one to expire before posting another."
    );
  }

  /* ---------------------------------------------
     DUPLICATE JOB DETECTION (ANTI-SPAM)
     Uses: detect_duplicate_job(...)
  ---------------------------------------------- */
  const { data: isDuplicate, error: dupErr } = await supabase.rpc(
    "detect_duplicate_job",
    {
      p_title: params.title.trim(),
      p_phone: params.contact_phone.trim(),
      p_location: params.location_id,
    }
  );

  if (dupErr) {
    console.error("Duplicate check failed:", dupErr);
    throw new Error("Could not verify job uniqueness. Please try again.");
  }

  if (isDuplicate) {
    throw new Error(
      "You already posted a similar job recently. You can edit or delete the existing one instead."
    );
  }

  /* ---------------------------------------------
     INSERT JOB (AUTHORITATIVE STEP)
  ---------------------------------------------- */
  const { error: insertErr } = await supabase.from("jobs").insert({
    title: params.title.trim(),
    description: params.description?.trim() || null,
    pay_type: params.pay_type,
    contact_method: params.contact_method,
    contact_phone: params.contact_phone.trim(),
    expires_at: params.expires_at.toISOString(),
    location_id: params.location_id,
    employer_id: user.id,
    urgent: Boolean(params.urgent),
  });

  if (insertErr) {
    throw insertErr;
  }

  /* ---------------------------------------------
     FIRE-AND-FORGET NOTIFICATION
     (DO NOT BLOCK JOB POSTING)
  ---------------------------------------------- */
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) return;

    await fetch(`${ENV.SUPABASE_URL}/functions/v1/notify_new_job`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        location_id: params.location_id,
        title: params.title.trim(),
        urgent: Boolean(params.urgent),
      }),
    });
  } catch (notifyErr) {
    // Intentionally swallowed — job is already posted
    console.warn("Notification failed:", notifyErr);
  }
}
