import AsyncStorage from "@react-native-async-storage/async-storage";
import { ResolvedLocation } from "./location.types";

const KEY = "awojobs:resolved_location";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export async function getCachedLocation(): Promise<ResolvedLocation | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ResolvedLocation;
    return parsed;
  } catch {
    return null;
  }
}

export async function isLocationFresh(loc: ResolvedLocation): Promise<boolean> {
  return Date.now() - loc.resolved_at < MAX_AGE_MS;
}

export async function saveCachedLocation(loc: ResolvedLocation) {
  await AsyncStorage.setItem(KEY, JSON.stringify(loc));
}

export async function clearCachedLocation() {
  await AsyncStorage.removeItem(KEY);
}
