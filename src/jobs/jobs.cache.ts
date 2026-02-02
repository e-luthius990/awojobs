import AsyncStorage from "@react-native-async-storage/async-storage";
import { Job } from "./jobs.types";

const key = (locationId: string) => `awojobs:jobs:${locationId}`;

export async function getCachedJobs(locationId: string): Promise<Job[]> {
  const raw = await AsyncStorage.getItem(key(locationId));
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Job[];
  } catch {
    return [];
  }
}

export async function setCachedJobs(locationId: string, jobs: Job[]) {
  await AsyncStorage.setItem(key(locationId), JSON.stringify(jobs));
}
