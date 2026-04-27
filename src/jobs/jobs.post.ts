/**
 * LEGACY PAYMENT-LED POSTING FLOW
 *
 * This module belongs to the old draft -> payment intent flow.
 * It is not the active posting path for the current location-based feed flow.
 *
 * Current posting should use the RPC-based create_job_with_detected_location path.
 * Do not use this file for nearby-feed posting tests.
 */

import { supabase } from "../core/supabase";
import { validateJob } from "./jobs.validation";
import { ENV } from "../core/config";

/* =====================================================
   HELPERS
===================================================== */

function normalizeUgPhone(phone?: string | null) {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("256")) return `+${digits}`;
  if (digits.startsWith("0")) return `+256${digits.slice(1)}`;
  if (digits.length === 9) return `+256${digits}`;

  return null;
}

/* =====================================================
   STEP 1 — CREATE DRAFT JOB
===================================================== */

export async function createDraftJob(params: {
  title: string;
  description?: string;
  pay_type: "daily" | "weekly" | "monthly";
  contact_method: "call" | "whatsapp" | "walk_in" | "in_app";
  contact_phone?: string;
  location_id: string;
}) {
  validateJob({
    title: params.title,
    pay_type: params.pay_type,
    contact_method: params.contact_method,
    contact_phone: params.contact_phone,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
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

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      title: params.title.trim(),
      description: params.description?.trim() ?? null,
      pay_type: params.pay_type,
      contact_method: params.contact_method,
      contact_phone: normalizedPhone,
      location_id: params.location_id,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Failed to create draft job.");
  }

  return data.id;
}

/* =====================================================
   STEP 2 — CREATE PAYMENT INTENT
===================================================== */

export async function createJobPaymentIntent(params: {
  draft_id: string;
  sponsorship?: "sponsored_day" | "sponsored_week" | "sponsored_month";
  mode?: "create" | "renew";
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Authentication required.");
  }

  const idempotencyKey = crypto.randomUUID();

  const res = await fetch(
    `${ENV.SUPABASE_URL}/functions/v1/create_job_payment_intent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        draft_id: params.draft_id,
        sponsorship: params.sponsorship ?? null,
        mode: params.mode ?? "create",
        idempotency_key: idempotencyKey,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Unable to initiate job payment.");
  }

  return await res.json();
}

/* =====================================================
   COMBINED HELPER (OPTIONAL)
   Draft + Intent in one call (frontend convenience)
===================================================== */

export async function initiateJobPost(params: {
  title: string;
  description?: string;
  pay_type: "daily" | "weekly" | "monthly";
  contact_method: "call" | "whatsapp" | "walk_in" | "in_app";
  contact_phone?: string;
  location_id: string;
  sponsorship?: "sponsored_day" | "sponsored_week" | "sponsored_month";
}) {
  const draftId = await createDraftJob({
    title: params.title,
    description: params.description,
    pay_type: params.pay_type,
    contact_method: params.contact_method,
    contact_phone: params.contact_phone,
    location_id: params.location_id,
  });

  return await createJobPaymentIntent({
    draft_id: draftId,
    sponsorship: params.sponsorship,
    mode: "create",
  });
}