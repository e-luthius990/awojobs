import { supabase } from "../core/supabase";
import { validateJob } from "./jobs.validation";
import { ENV } from "../core/config";

export async function updateJob(
  jobId: string,
  params: {
    title: string;
    description?: string;
    pay_type: "daily" | "weekly" | "monthly";
    contact_method: "call" | "whatsapp" | "walk_in" | "in_app";
    contact_phone?: string;
    expires_at: Date;
  },
) {
  validateJob({
    title: params.title,
    description: params.description,
    pay_type: params.pay_type,
    contact_method: params.contact_method,
    contact_phone: params.contact_phone,
    expires_at: params.expires_at,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(
    `${ENV.SUPABASE_URL}/functions/v1/update_job`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        job_id: jobId,
        update: {
          title: params.title.trim(),
          description: params.description?.trim() ?? null,
          pay_type: params.pay_type,
          contact_method: params.contact_method,
          contact_phone:
            params.contact_method === "call" ||
            params.contact_method === "whatsapp"
              ? params.contact_phone?.trim()
              : null,
          expires_at: params.expires_at.toISOString(),
        },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Unable to update job");
  }

  return await res.json();
}