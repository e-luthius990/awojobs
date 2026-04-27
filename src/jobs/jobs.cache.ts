import AsyncStorage from "@react-native-async-storage/async-storage";
import type { JobWithCoords } from "./jobs.types";

const CACHE_VERSION = 3;
const MAX_CACHE_AGE_MS = 60_000; // 1 minute

type FeedScope = "local" | "national";
type LocalResolution = "exact_local" | "area_local" | "district_only";

type CacheKeyInput =
  | {
      scope: "national";
    }
  | {
      scope: "local";
      resolutionLevel?: LocalResolution | null;
      locationId?: string | null;
      districtId?: string | null;
    };

type CachePayload = {
  version: number;
  timestamp: number;
  jobs: JobWithCoords[];
};

function buildCacheKey(input: CacheKeyInput): string {
  if (input.scope === "national") {
    return `awojobs:jobs:v${CACHE_VERSION}:national`;
  }

  const resolutionLevel =
    input.resolutionLevel === "exact_local" ||
    input.resolutionLevel === "area_local" ||
    input.resolutionLevel === "district_only"
      ? input.resolutionLevel
      : null;

  const locationId =
    typeof input.locationId === "string" && input.locationId.trim().length > 0
      ? input.locationId.trim()
      : null;

  const districtId =
    typeof input.districtId === "string" && input.districtId.trim().length > 0
      ? input.districtId.trim()
      : null;

  if ((resolutionLevel === "exact_local" || resolutionLevel === "area_local") && locationId) {
    return `awojobs:jobs:v${CACHE_VERSION}:local:${resolutionLevel}:${locationId}:${districtId ?? "none"}`;
  }

  if ((resolutionLevel === "district_only" || !resolutionLevel) && districtId) {
    return `awojobs:jobs:v${CACHE_VERSION}:local:district:${districtId}`;
  }

  return `awojobs:jobs:v${CACHE_VERSION}:local:unresolved`;
}

/* ------------------------------------------------
   GET CACHE
------------------------------------------------- */
export async function getCachedJobs(
  input: CacheKeyInput,
): Promise<JobWithCoords[]> {
  const raw = await AsyncStorage.getItem(buildCacheKey(input));

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as CachePayload;

    if (
      parsed.version !== CACHE_VERSION ||
      Date.now() - parsed.timestamp > MAX_CACHE_AGE_MS
    ) {
      return [];
    }

    return Array.isArray(parsed.jobs) ? parsed.jobs : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------
   SET CACHE
------------------------------------------------- */
export async function setCachedJobs(
  input: CacheKeyInput,
  jobs: JobWithCoords[],
) {
  const payload: CachePayload = {
    version: CACHE_VERSION,
    timestamp: Date.now(),
    jobs: jobs.slice(0, 100),
  };

  await AsyncStorage.setItem(
    buildCacheKey(input),
    JSON.stringify(payload),
  );
}

/* ------------------------------------------------
   CLEAR CACHE
------------------------------------------------- */
export async function clearCachedJobs(input: CacheKeyInput) {
  await AsyncStorage.removeItem(buildCacheKey(input));
}