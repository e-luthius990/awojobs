import { Share } from "react-native";
import * as Linking from "expo-linking";
import { Job } from "./jobs.types";
import { ENV } from "../core/config";

/* ---------------------------------------------
   CONFIG
---------------------------------------------- */
const BASE_URL = ENV.WEB_BASE_URL; // e.g. https://awojobs.app

/* ---------------------------------------------
   SAFE TEXT HELPERS
---------------------------------------------- */
function sanitize(text?: string | null, max = 280) {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ").slice(0, max);
}

/* ---------------------------------------------
   BUILD SHARE TEXT
---------------------------------------------- */
export function buildJobShareText(job: Job) {
  const expires = new Date(job.expires_at).toLocaleDateString("en-UG");

  const contactLine =
    job.contact_method === "walk_in"
      ? "Apply: Walk-in"
      : job.contact_method === "in_app"
        ? "Apply: In-app"
        : `Contact: ${job.contact_method.toUpperCase()} • ${job.contact_phone}`;

  const description = sanitize(job.description, 300);

  const details = description
    ? `\n\nDetails:\n${description}`
    : "";

  const url = `${BASE_URL}/job/${job.id}`;

  return (
    `Job Opportunity — AwoJobs\n\n` +
    `${sanitize(job.title, 120)}\n` +
    `Pay: ${job.pay_type}\n` +
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

  /* ---------- Native Share ---------- */
  try {
    const result = await Share.share({
      message,
      title: "AwoJobs",
    });

    if (result.action === Share.sharedAction) {
      return;
    }
  } catch {
    // fallback
  }

  /* ---------- WhatsApp Fallback ---------- */
  try {
    const encoded = encodeURIComponent(message);
    await Linking.openURL(`https://wa.me/?text=${encoded}`);
  } catch {
    // silent fail
  }
}
