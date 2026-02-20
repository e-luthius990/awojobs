import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "saved_job_ids";

export async function getSavedJobs(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function isJobSaved(jobId: string): Promise<boolean> {
  const ids = await getSavedJobs();
  return ids.includes(jobId);
}

export async function toggleSavedJob(jobId: string): Promise<boolean> {
  const ids = await getSavedJobs();

  let updated: string[];
  let saved: boolean;

  if (ids.includes(jobId)) {
    updated = ids.filter((id) => id !== jobId);
    saved = false;
  } else {
    updated = [...ids, jobId];
    saved = true;
  }

  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  return saved;
}
