import AsyncStorage from "@react-native-async-storage/async-storage";
import { Job } from "./jobs.types";

const CACHE_VERSION = 1;
const MAX_CACHE_AGE_MS = 60_000; // 1 minute

const key = (
  locationId: string,
  scope: "local" | "national"
) => `awojobs:jobs:v${CACHE_VERSION}:${locationId}:${scope}`;

type CachePayload = {
  version: number;
  timestamp: number;
  jobs: Job[];
};

/* ------------------------------------------------
   GET CACHE
------------------------------------------------- */
export async function getCachedJobs(
  locationId: string,
  scope: "local" | "national"
): Promise<Job[]> {
  const raw = await AsyncStorage.getItem(
    key(locationId, scope)
  );

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as CachePayload;

    if (
      parsed.version !== CACHE_VERSION ||
      Date.now() - parsed.timestamp > MAX_CACHE_AGE_MS
    ) {
      return [];
    }

    return Array.isArray(parsed.jobs)
      ? parsed.jobs
      : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------
   SET CACHE
------------------------------------------------- */
export async function setCachedJobs(
  locationId: string,
  scope: "local" | "national",
  jobs: Job[]
) {
  const payload: CachePayload = {
    version: CACHE_VERSION,
    timestamp: Date.now(),
    jobs: jobs.slice(0, 100), // cap size
  };

  await AsyncStorage.setItem(
    key(locationId, scope),
    JSON.stringify(payload)
  );
}