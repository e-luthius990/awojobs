import { Job } from "./jobs.types";

export function jobFreshnessScore(job: Job): number {
  const now = Date.now();

  const expiresAt = new Date(job.expires_at).getTime();
  const createdAt = new Date(job.created_at).getTime();

  const isUrgent =
    new Date(job.expires_at).toDateString() === new Date().toDateString();

  const hoursOld = (now - createdAt) / (1000 * 60 * 60);

  // Higher = more important
  if (isUrgent) return 10_000;
  if (hoursOld <= 6) return 8_000;
  if (hoursOld <= 24) return 6_000;
  if (hoursOld <= 72) return 4_000;

  return 2_000;
}
