import AsyncStorage from "@react-native-async-storage/async-storage";
import { ResolvedLocation } from "./location.types";

/* =====================================================
   USER RESOLVED LOCATION (TTL PROTECTED)
===================================================== */

const LOCATION_KEY = "awojobs:location";
const MAX_AGE = 5 * 60 * 1000; // 5 minutes

export async function getCachedLocation(): Promise<ResolvedLocation | null> {
  const raw = await AsyncStorage.getItem(LOCATION_KEY);
  if (!raw) return null;

  try {
    const parsed: ResolvedLocation = JSON.parse(raw);

    if (!parsed?.resolved_at) return null;

    if (Date.now() - parsed.resolved_at > MAX_AGE) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function saveCachedLocation(loc: ResolvedLocation) {
  await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
}

export async function clearCachedLocation() {
  await AsyncStorage.removeItem(LOCATION_KEY);
}

/* =====================================================
   LOCATION LIST CACHE (district / town / sub_county)
===================================================== */

const LIST_PREFIX = "awojobs:location_list:";

export async function getCachedList<T = any>(
  key: string,
): Promise<T[] | null> {
  const raw = await AsyncStorage.getItem(`${LIST_PREFIX}${key}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setCachedList<T = any>(
  key: string,
  value: T[],
) {
  await AsyncStorage.setItem(
    `${LIST_PREFIX}${key}`,
    JSON.stringify(value),
  );
}
