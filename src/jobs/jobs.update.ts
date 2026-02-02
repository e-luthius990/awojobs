import { supabase } from "../core/supabase";
import { validateJob } from "./jobs.validation";

export async function updateJob(
  jobId: string,
  params: {
    title: string;
    description?: string;
    pay_type: "daily" | "weekly" | "monthly";
    contact_method: "call" | "whatsapp" | "walk_in";
    contact_phone: string;
    expires_at: Date;
  },
) {
  validateJob(params);

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user?.id) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      title: params.title.trim(),
      description: params.description?.trim() || null,
      pay_type: params.pay_type,
      contact_method: params.contact_method,
      contact_phone: params.contact_phone.trim(),
      expires_at: params.expires_at.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("employer_id", user.id);

  if (error) throw error;
}
