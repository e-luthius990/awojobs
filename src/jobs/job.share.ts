import { Share, Platform } from "react-native";
import * as Linking from "expo-linking";
import { Job } from "./jobs.types";

/* ---------------------------------------------
   CONFIG
---------------------------------------------- */
const AWOJOBS_BASE_URL = "https://awojobs.app";

/* ---------------------------------------------
   BUILD SHARE TEXT
---------------------------------------------- */
export function buildJobShareText(job: Job) {
  const expires = new Date(job.expires_at).toLocaleDateString();

  const contactLine =
    job.contact_method === "walk_in"
      ? "Apply: Walk-in"
      : `Contact: ${job.contact_method.toUpperCase()} • ${job.contact_phone}`;

  const details = job.description
    ? `\n\nDetails:\n${job.description}`
    : "";

  const url = `${AWOJOBS_BASE_URL}/job/${job.id}`;

  return (
    `🧰 Job Opportunity on AwoJobs\n\n` +
    `${job.title}\n` +
    `Pay: ${job.pay_type}\n` +
    `${contactLine}\n` +
    `Expires: ${expires}` +
    `${details}\n\n` +
    `View job: ${url}`
  );
}

/* ---------------------------------------------
   SHARE JOB (NATIVE → FALLBACK)
---------------------------------------------- */
export async function shareJob(job: Job) {
  const message = buildJobShareText(job);

  /* ---------- Native share (Android / iOS / Web) ---------- */
  try {
    const result = await Share.share({
      message,
      title: "Share job from AwoJobs",
    });

    if (result.action === Share.sharedAction) {
      return;
    }
  } catch {
    // fall through to WhatsApp fallback
  }

  /* ---------- WhatsApp fallback ---------- */
  try {
    const encoded = encodeURIComponent(message);
    await Linking.openURL(`https://wa.me/?text=${encoded}`);
  } catch {
    // silent fail – user cancelled or no apps available
  }
}
