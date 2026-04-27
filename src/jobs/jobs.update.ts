import { supabase } from "../core/supabase";
import { validateJob } from "./jobs.validation";

function normalizeUgPhone(phone?: string | null) {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("256") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+256${digits.slice(1)}`;
  if (digits.length === 9) return `+256${digits}`;

  return null;
}

export async function updateJob(
  jobId: string,
  params: {
    title: string;
    description?: string;
    pay_type: "daily" | "weekly" | "monthly" | "not_specified";
    contact_method: "call" | "whatsapp" | "walk_in" | "in_app";
    contact_phone?: string;
  },
) {
  validateJob({
    title: params.title,
    description: params.description,
    pay_type: params.pay_type,
    contact_method: params.contact_method,
    contact_phone: params.contact_phone,
  });

  const normalizedPhone =
    params.contact_method === "call" ||
    params.contact_method === "whatsapp"
      ? normalizeUgPhone(params.contact_phone)
      : null;

  const normalizedJobId = typeof jobId === "string" ? jobId.trim() : "";
  if (!normalizedJobId) {
    throw new Error("Missing job id");
  }

  const { data, error } = await supabase
    .from("jobs")
    .update({
      title: params.title.trim(),
      description: params.description?.trim() ?? "",
      pay_type: params.pay_type,
      contact_method: params.contact_method,
      contact_phone: normalizedPhone,
    })
    .eq("id", normalizedJobId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Unable to update job");
  }

  return data;
}