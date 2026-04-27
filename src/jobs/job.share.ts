import { Share } from "react-native";
import * as Linking from "expo-linking";
import { Job } from "./jobs.types";
import { ENV } from "../core/config";

/* ---------------------------------------------
   CONFIG
---------------------------------------------- */

const BASE_URL = ENV.WEB_BASE_URL?.replace(/\/+$/, "") ?? "";

/* ---------------------------------------------
   HELPERS
---------------------------------------------- */

function sanitize(text?: string | null, max = 280) {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ").slice(0, max);
}

function formatPayType(type?: string | null) {
  if (!type || type === "not_specified") {
    return "Not specified";
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatExpiry(expiresAt?: string | null) {
  if (!expiresAt) return "N/A";

  const date = new Date(expiresAt);
  if (isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-UG");
}

/* ---------------------------------------------
   BUILD SHARE TEXT
---------------------------------------------- */

export function buildJobShareText(job: Job) {
  const expires = formatExpiry(job.expires_at);

  let contactLine = "Apply: In-app";

  if (job.contact_method === "walk_in") {
    contactLine = "Apply: Walk-in";
  } else if (
    (job.contact_method === "call" ||
      job.contact_method === "whatsapp") &&
    job.contact_phone
  ) {
    contactLine = `Contact: ${job.contact_method.toUpperCase()} • ${job.contact_phone}`;
  }

  const description = sanitize(job.description, 300);
  const locationLine = job.posting_display_label
    ? `Location: ${job.posting_display_label}\n`
    : "";

  const details = description
    ? `\n\nDetails:\n${description}`
    : "";

  const url = `${BASE_URL}/job/${job.id}`;

  return (
    `Job Opportunity — AwoJobs\n\n` +
    `${sanitize(job.title, 120)}\n` +
    `${locationLine}` +
    `Pay: ${formatPayType(job.pay_type)}\n` +
    `${contactLine}\n` +
    `Expires: ${expires}` +
    `${details}\n\n` +
    `View: ${url}`
  );
}

/* ---------------------------------------------
   SHARE JOB
---------------------------------------------- */

export async function shareJob(job: Job) {
  const message = buildJobShareText(job);

  try {
    const result = await Share.share({
      message,
      title: "AwoJobs",
    });

    if (result.action === Share.sharedAction) {
      return;
    }
  } catch {
    // fall through to WhatsApp
  }

  try {
    const encoded = encodeURIComponent(message);
    await Linking.openURL(`https://wa.me/?text=${encoded}`);
  } catch {
    // silent fail
  }
}