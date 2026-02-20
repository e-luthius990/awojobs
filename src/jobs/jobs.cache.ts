import AsyncStorage from "@react-native-async-storage/async-storage";
import { Job } from "./jobs.types";

const CACHE_VERSION = 1;

const key = (locationId: string) =>
  `awojobs:jobs:v${CACHE_VERSION}:${locationId}`;

type CachePayload = {
  version: number;
  jobs: Job[];
};

export async function getCachedJobs(locationId: string): Promise<Job[]> {
  const raw = await AsyncStorage.getItem(key(locationId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as CachePayload;

    if (parsed.version !== CACHE_VERSION) {
      return [];
    }

    return Array.isArray(parsed.jobs) ? parsed.jobs : [];
  } catch {
    return [];
  }
}

export async function setCachedJobs(locationId: string, jobs: Job[]) {
  const payload: CachePayload = {
    version: CACHE_VERSION,
    jobs: jobs.slice(0, 100), // cap cache size
  };

  await AsyncStorage.setItem(
    key(locationId),
    JSON.stringify(payload),
  );
}
