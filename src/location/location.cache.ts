import AsyncStorage from "@react-native-async-storage/async-storage";
import { ResolvedLocation, ResolutionLevel } from "./location.types";

const LOCATION_KEY = "awojobs:location:v2";

/**
 * Keep canonical location cache long enough for degraded fallback paths.
 * Freshness for browse/feed should be decided by location.service, not here.
 */
const LOCATION_HARD_MAX_AGE_MS = 30 * 60 * 1000;

const LIST_PREFIX = "awojobs:location_list:v2:";
const LIST_MAX_AGE_MS = 10 * 60 * 1000;

type CachedListEnvelope<T> = {
  saved_at: number;
  items: T[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNumberOrNull(value: unknown): value is number | null {
  return isFiniteNumber(value) || value === null;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function buildListKey(key: string) {
  return `${LIST_PREFIX}${key}`;
}

function isExpired(savedAt: number, maxAgeMs: number) {
  return Date.now() - savedAt > maxAgeMs;
}

function isResolvedLocationSource(
  value: unknown,
): value is ResolvedLocation["source"] {
  return (
    value === "live_gps" ||
    value === "live_fused" ||
    value === "last_known_gps" ||
    value === "last_known_fused" ||
    value === "cached_canonical"
  );
}

function isResolutionLevel(value: unknown): value is ResolutionLevel {
  return (
    value === "exact_local" ||
    value === "area_local" ||
    value === "district_only" ||
    value === "uganda_only" ||
    value === "outside_uganda"
  );
}

function hasValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function isUsableCachedLocation(location: ResolvedLocation) {
  if (!hasValidLatLng(location.lat, location.lng)) {
    return false;
  }

  if (!isResolutionLevel(location.resolution_level)) {
    return false;
  }

  if (!isBoolean(location.is_within_uganda)) {
    return false;
  }

  if (!isFiniteNumber(location.resolved_at)) {
    return false;
  }

  if (
    location.resolution_confidence !== null &&
    location.resolution_confidence !== undefined &&
    !isFiniteNumber(location.resolution_confidence)
  ) {
    return false;
  }

  if (
    location.approximate_area_radius_meters !== null &&
    location.approximate_area_radius_meters !== undefined &&
    !isFiniteNumber(location.approximate_area_radius_meters)
  ) {
    return false;
  }

  if (
    location.resolution_level === "exact_local" ||
    location.resolution_level === "area_local"
  ) {
    return (
      readNonEmptyString(location.location_id) !== null &&
      readNonEmptyString(location.district_id) !== null &&
      readNonEmptyString(location.display_label) !== null
    );
  }

  if (location.resolution_level === "district_only") {
    return (
      readNonEmptyString(location.district_id) !== null &&
      readNonEmptyString(location.display_label) !== null
    );
  }

  if (
    location.resolution_level === "uganda_only" ||
    location.resolution_level === "outside_uganda"
  ) {
    return true;
  }

  return false;
}

function normalizeResolvedLocation(value: unknown): ResolvedLocation | null {
  if (!value || typeof value !== "object") return null;

  const parsed = value as Partial<ResolvedLocation>;

  if (!isResolvedLocationSource(parsed.source)) {
    return null;
  }

  if (!hasValidLatLng(parsed.lat, parsed.lng)) {
    return null;
  }

  if (!isNumberOrNull(parsed.accuracy_meters ?? null)) {
    return null;
  }

  if (!isBoolean(parsed.is_precise)) {
    return null;
  }

  if (!isBoolean(parsed.is_fallback)) {
    return null;
  }

  if (!isFiniteNumber(parsed.resolved_at)) {
    return null;
  }

  if (!isResolutionLevel(parsed.resolution_level)) {
    return null;
  }

  if (!isBoolean(parsed.is_within_uganda)) {
    return null;
  }

  if (
    parsed.resolution_confidence !== undefined &&
    !isNumberOrNull(parsed.resolution_confidence)
  ) {
    return null;
  }

  if (
    parsed.approximate_area_radius_meters !== undefined &&
    !isNumberOrNull(parsed.approximate_area_radius_meters)
  ) {
    return null;
  }

  const normalized: ResolvedLocation = {
    source: parsed.source,
    lat: parsed.lat,
    lng: parsed.lng,
    accuracy_meters: parsed.accuracy_meters ?? null,
    resolved_at: parsed.resolved_at,

    resolution_level: parsed.resolution_level,
    is_within_uganda: parsed.is_within_uganda,

    location_id: readNonEmptyString(parsed.location_id),
    district_id: readNonEmptyString(parsed.district_id),
    district_name: readNonEmptyString(parsed.district_name),
    town_name: readNonEmptyString(parsed.town_name),
    sub_county_name: readNonEmptyString(parsed.sub_county_name),
    display_label: readNonEmptyString(parsed.display_label),

    distance_meters:
      typeof parsed.distance_meters === "number" &&
      Number.isFinite(parsed.distance_meters)
        ? parsed.distance_meters
        : parsed.distance_meters === null
          ? null
          : null,

    resolution_confidence:
      typeof parsed.resolution_confidence === "number" &&
      Number.isFinite(parsed.resolution_confidence)
        ? parsed.resolution_confidence
        : parsed.resolution_confidence === null
          ? null
          : null,

    approximate_area_radius_meters:
      typeof parsed.approximate_area_radius_meters === "number" &&
      Number.isFinite(parsed.approximate_area_radius_meters)
        ? parsed.approximate_area_radius_meters
        : parsed.approximate_area_radius_meters === null
          ? null
          : null,

    is_precise: parsed.is_precise,
    is_fallback: parsed.is_fallback,
  };

  if (!isUsableCachedLocation(normalized)) {
    return null;
  }

  return normalized;
}

export async function getCachedLocation(): Promise<ResolvedLocation | null> {
  const raw = await AsyncStorage.getItem(LOCATION_KEY);
  if (!raw) return null;

  try {
    const normalized = normalizeResolvedLocation(JSON.parse(raw));

    if (!normalized) {
      await AsyncStorage.removeItem(LOCATION_KEY);
      return null;
    }

    if (isExpired(normalized.resolved_at, LOCATION_HARD_MAX_AGE_MS)) {
      await AsyncStorage.removeItem(LOCATION_KEY);
      return null;
    }

    return normalized;
  } catch {
    await AsyncStorage.removeItem(LOCATION_KEY);
    return null;
  }
}

export async function saveCachedLocation(loc: ResolvedLocation): Promise<void> {
  const normalized = normalizeResolvedLocation(loc);

  if (!normalized) {
    throw new Error("Invalid canonical resolved location cache payload");
  }

  await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(normalized));
}

export async function clearCachedLocation(): Promise<void> {
  await AsyncStorage.removeItem(LOCATION_KEY);
}

export async function getCachedList<T = unknown>(
  key: string,
): Promise<T[] | null> {
  const storageKey = buildListKey(key);
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CachedListEnvelope<T>>;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.saved_at !== "number" ||
      !Number.isFinite(parsed.saved_at) ||
      !Array.isArray(parsed.items)
    ) {
      await AsyncStorage.removeItem(storageKey);
      return null;
    }

    if (isExpired(parsed.saved_at, LIST_MAX_AGE_MS)) {
      await AsyncStorage.removeItem(storageKey);
      return null;
    }

    return parsed.items;
  } catch {
    await AsyncStorage.removeItem(storageKey);
    return null;
  }
}

export async function setCachedList<T = unknown>(
  key: string,
  value: T[],
): Promise<void> {
  if (!Array.isArray(value)) {
    throw new Error("Cached list value must be an array");
  }

  const payload: CachedListEnvelope<T> = {
    saved_at: Date.now(),
    items: value,
  };

  await AsyncStorage.setItem(buildListKey(key), JSON.stringify(payload));
}

export async function clearCachedList(key: string): Promise<void> {
  await AsyncStorage.removeItem(buildListKey(key));
}