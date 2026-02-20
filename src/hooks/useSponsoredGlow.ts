import { JobWithCoords } from "@jobs/jobs.types";

export function useSponsoredGlow(job: JobWithCoords) {
  const isNational =
    job.is_sponsored &&
    job.sponsor_scope === "national" &&
    job.sponsored_until &&
    new Date(job.sponsored_until).getTime() > Date.now();

  if (!isNational) return {};

  return {
    borderWidth: 1,
    borderColor: "#FACC15",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  };
}
