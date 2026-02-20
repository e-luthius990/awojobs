import { supabase } from "../core/supabase";
import { validateJob } from "./jobs.validation";
import { ENV } from "../core/config";

function normalizeUgPhone(phone?: string | null) {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("256")) return `+${digits}`;
  if (digits.startsWith("0")) return `+256${digits.slice(1)}`;
  if (digits.length === 9) return `+256${digits}`;

  return null; // invalid format
}

export async function initiateJobPost(params: {
  title: string;
  description?: string;
  pay_type: "daily" | "weekly" | "monthly";
  contact_method: "call" | "whatsapp" | "walk_in" | "in_app";
  contact_phone?: string;
  expires_at: Date;
  location_id: string; // optional if server enforces profile binding
  sponsorship?: "sponsor_5d" | "sponsor_10d" | "sponsor_25d";
}) {
  validateJob({
    title: params.title,
    pay_type: params.pay_type,
    contact_method: params.contact_method,
    contact_phone: params.contact_phone,
    expires_at: params.expires_at,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You must be logged in to post a job.");
  }

  const normalizedPhone =
    params.contact_method === "call" ||
    params.contact_method === "whatsapp"
      ? normalizeUgPhone(params.contact_phone)
      : null;

  if (
    (params.contact_method === "call" ||
      params.contact_method === "whatsapp") &&
    !normalizedPhone
  ) {
    throw new Error("Invalid Ugandan phone number.");
  }

  const res = await fetch(
    `${ENV.SUPABASE_URL}/functions/v1/create_job_intent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        job: {
          title: params.title.trim(),
          description: params.description?.trim() ?? null,
          pay_type: params.pay_type,
          contact_method: params.contact_method,
          contact_phone: normalizedPhone,
          expires_at: params.expires_at.toISOString(),
          location_id: params.location_id, // server must validate
        },
        sponsorship: params.sponsorship ?? null,
        idempotency_key: crypto.randomUUID(),
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Unable to initiate job payment.");
  }

  return await res.json();
}
