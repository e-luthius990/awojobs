import AsyncStorage from "@react-native-async-storage/async-storage";
import { ResolvedLocation } from "./location.types";

const LOCATION_KEY = "awojobs:location";
const MAX_AGE = 5 * 60 * 1000;

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isNumberOrNull(value: unknown): value is number | null {
  return (typeof value === "number" && Number.isFinite(value)) || value === null;
}

function normalizeResolvedLocation(value: unknown): ResolvedLocation | null {
  if (!value || typeof value !== "object") return null;

  const parsed = value as Partial<ResolvedLocation>;

  if (parsed.source !== "gps" && parsed.source !== "manual") {
    return null;
  }

  if (!isStringOrNull(parsed.location_id ?? null)) return null;
  if (!isStringOrNull(parsed.district ?? null)) return null;
  if (!isStringOrNull(parsed.town ?? null)) return null;
  if (!isStringOrNull(parsed.sub_county ?? null)) return null;
  if (!isNumberOrNull(parsed.lat ?? null)) return null;
  if (!isNumberOrNull(parsed.lng ?? null)) return null;

  if (
    typeof parsed.resolved_at !== "number" ||
    !Number.isFinite(parsed.resolved_at)
  ) {
    return null;
  }

  return {
    source: parsed.source,
    location_id: parsed.location_id ?? null,
    district: parsed.district ?? null,
    town: parsed.town ?? null,
    sub_county: parsed.sub_county ?? null,
    lat: parsed.lat ?? null,
    lng: parsed.lng ?? null,
    resolved_at: parsed.resolved_at,
  };
}

export async function getCachedLocation(): Promise<ResolvedLocation | null> {
  const raw = await AsyncStorage.getItem(LOCATION_KEY);
  if (!raw) return null;

  try {
    const normalized = normalizeResolvedLocation(JSON.parse(raw));
    if (!normalized) return null;

    if (Date.now() - normalized.resolved_at > MAX_AGE) {
      return null;
    }

    return normalized;
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

const LIST_PREFIX = "awojobs:location_list:";

export async function getCachedList<T = unknown>(
  key: string
): Promise<T[] | null> {
  const raw = await AsyncStorage.getItem(`${LIST_PREFIX}${key}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

export async function setCachedList<T = unknown>(
  key: string,
  value: T[]
) {
  await AsyncStorage.setItem(
    `${LIST_PREFIX}${key}`,
    JSON.stringify(value)
  );
}