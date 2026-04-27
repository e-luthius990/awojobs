import { supabase } from "../core/supabase";
import { getCachedLocation, saveCachedLocation } from "./location.cache";
import { ensureLocationPermission } from "./location.permissions";
import { getBrowseCoordinates, getPostCoordinates } from "./location.coords";

const BROWSE_CACHE_MAX_AGE_MS = 2 * 60 * 1000;
const HARD_STALE_MAX_AGE_MS = 30 * 60 * 1000;
const POSTING_MAX_ACCURACY_METERS = 1500;

export type ResolutionLevel =
  | "exact_local"
  | "area_local"
  | "district_only"
  | "uganda_only"
  | "outside_uganda";

export type ResolveMode = "browse" | "post";

export type CanonicalSource =
  | "live_gps"
  | "live_fused"
  | "last_known_gps"
  | "last_known_fused"
  | "cached_canonical";

export type CanonicalResolvedLocation = {
  source: CanonicalSource;
  lat: number;
  lng: number;
  accuracy_meters: number | null;
  resolved_at: number;

  is_within_uganda: boolean;
  resolution_level: ResolutionLevel;

  location_id: string | null;
  district_id: string | null;

  district_name: string | null;
  town_name: string | null;
  sub_county_name: string | null;
  display_label: string | null;

  distance_meters: number | null;
  resolution_confidence: number | null;
  approximate_area_radius_meters: number | null;

  is_precise: boolean;
  is_fallback: boolean;
};

type ResolverRow = {
  is_within_uganda: boolean;
  resolution_level: ResolutionLevel;
  location_id: string | null;
  district_id: string | null;
  district_name: string | null;
  town_name: string | null;
  sub_county_name: string | null;
  display_label: string | null;
  distance_meters: number | null;
  resolution_confidence?: number | null;
  approximate_area_radius_meters?: number | null;
};

export type LocationResolveErrorCode =
  | "permission_denied"
  | "location_services_disabled"
  | "device_location_failed"
  | "resolver_failed"
  | "location_unresolved"
  | "outside_supported_country"
  | "posting_location_not_precise_enough";

export class LocationResolveError extends Error {
  code: LocationResolveErrorCode;

  constructor(code: LocationResolveErrorCode, message: string) {
    super(message);
    this.name = "LocationResolveError";
    this.code = code;
  }
}

type ResolveLocationOptions = {
  mode: ResolveMode;
  requireFresh: boolean;
  allowCachedFallback: boolean;
  freshCacheMaxAgeMs: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function ageMs(resolvedAt?: number | null) {
  if (!resolvedAt || !isFiniteNumber(resolvedAt)) {
    return Number.POSITIVE_INFINITY;
  }

  return Date.now() - resolvedAt;
}

function isWithinMaxAge(
  resolvedAt: number | null | undefined,
  maxAgeMs: number,
) {
  return ageMs(resolvedAt) < maxAgeMs;
}

function isHardStale(resolvedAt?: number | null) {
  return ageMs(resolvedAt) >= HARD_STALE_MAX_AGE_MS;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function isValidResolutionLevel(value: unknown): value is ResolutionLevel {
  return (
    value === "exact_local" ||
    value === "area_local" ||
    value === "district_only" ||
    value === "uganda_only" ||
    value === "outside_uganda"
  );
}

function isValidCanonicalSource(value: unknown): value is CanonicalSource {
  return (
    value === "live_gps" ||
    value === "live_fused" ||
    value === "last_known_gps" ||
    value === "last_known_fused" ||
    value === "cached_canonical"
  );
}

function isStructurallyValidCanonicalLocation(
  location: Partial<CanonicalResolvedLocation> | null | undefined,
): location is CanonicalResolvedLocation {
  if (!location) return false;

  if (
    !isFiniteNumber(location.lat) ||
    !isFiniteNumber(location.lng) ||
    location.lat < -90 ||
    location.lat > 90 ||
    location.lng < -180 ||
    location.lng > 180 ||
    !isFiniteNumber(location.resolved_at)
  ) {
    return false;
  }

  if (!isValidCanonicalSource(location.source)) {
    return false;
  }

  if (!isValidResolutionLevel(location.resolution_level)) {
    return false;
  }

  if (typeof location.is_within_uganda !== "boolean") {
    return false;
  }

  if (location.accuracy_meters !== null && location.accuracy_meters !== undefined) {
    if (!isFiniteNumber(location.accuracy_meters)) return false;
  }

  if (
    location.resolution_confidence !== null &&
    location.resolution_confidence !== undefined
  ) {
    if (!isFiniteNumber(location.resolution_confidence)) return false;
  }

  if (
    location.approximate_area_radius_meters !== null &&
    location.approximate_area_radius_meters !== undefined
  ) {
    if (!isFiniteNumber(location.approximate_area_radius_meters)) return false;
  }

  if (location.resolution_level === "exact_local") {
    return (
      readString(location.location_id) !== null &&
      readString(location.district_id) !== null &&
      readString(location.display_label) !== null
    );
  }

  if (location.resolution_level === "area_local") {
    return (
      readString(location.location_id) !== null &&
      readString(location.district_id) !== null &&
      readString(location.display_label) !== null
    );
  }

  if (location.resolution_level === "district_only") {
    return (
      readString(location.district_id) !== null &&
      readString(location.display_label) !== null
    );
  }

  return true;
}

function isUsableCanonicalLocation(
  location: CanonicalResolvedLocation | null,
): location is CanonicalResolvedLocation {
  if (!isStructurallyValidCanonicalLocation(location)) return false;
  if (isHardStale(location.resolved_at)) return false;
  return true;
}

function shouldPersistCanonicalLocation(location: CanonicalResolvedLocation) {
  return (
    location.is_within_uganda &&
    (
      location.resolution_level === "exact_local" ||
      location.resolution_level === "area_local" ||
      location.resolution_level === "district_only"
    )
  );
}

function isAllowedForPosting(location: CanonicalResolvedLocation) {
  if (!location.is_within_uganda) return false;

  if (
    location.resolution_level !== "exact_local" &&
    location.resolution_level !== "area_local" &&
    location.resolution_level !== "district_only"
  ) {
    return false;
  }

  if (location.accuracy_meters == null || !Number.isFinite(location.accuracy_meters)) {
    return false;
  }

  if (location.accuracy_meters > POSTING_MAX_ACCURACY_METERS) {
    return false;
  }

  if (
    (location.resolution_level === "exact_local" ||
      location.resolution_level === "area_local") &&
    !location.location_id
  ) {
    return false;
  }

  if (!location.district_id) {
    return false;
  }

  return true;
}

function toCachedCanonical(
  location: CanonicalResolvedLocation,
): CanonicalResolvedLocation {
  return {
    ...location,
    source: "cached_canonical",
    is_fallback: true,
  };
}

function toResolveError(
  code: LocationResolveErrorCode,
  fallbackMessage: string,
  cause?: unknown,
) {
  if (cause instanceof LocationResolveError) {
    return cause;
  }

  if (cause instanceof Error && cause.message.trim().length > 0) {
    return new LocationResolveError(code, cause.message);
  }

  return new LocationResolveError(code, fallbackMessage);
}

function inferLocationErrorFromUnknown(error: unknown): LocationResolveError {
  if (error instanceof LocationResolveError) {
    return error;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("location services") ||
    message.includes("services disabled") ||
    message.includes("gps is disabled")
  ) {
    return new LocationResolveError(
      "location_services_disabled",
      "Location services are disabled.",
    );
  }

  return new LocationResolveError(
    "device_location_failed",
    "We could not get your device location.",
  );
}

async function resolveCanonicalFromRpc(input: {
  lat: number;
  lng: number;
  accuracy_meters: number | null;
  source: Exclude<CanonicalSource, "cached_canonical">;
  mode: ResolveMode;
}): Promise<CanonicalResolvedLocation | null> {
  const { data, error } = await supabase.rpc("resolve_location_from_coords", {
    p_lat: input.lat,
    p_lng: input.lng,
    p_accuracy_meters: input.accuracy_meters,
    p_mode: input.mode,
  });

  if (error) {
    throw new LocationResolveError("resolver_failed", error.message);
  }

  const row = (Array.isArray(data) ? data[0] : data) as ResolverRow | null;

  if (!row) return null;
  if (!isValidResolutionLevel(row.resolution_level)) return null;

  const normalized: CanonicalResolvedLocation = {
    source: input.source,
    lat: input.lat,
    lng: input.lng,
    accuracy_meters: input.accuracy_meters,
    resolved_at: Date.now(),

    is_within_uganda: row.is_within_uganda,
    resolution_level: row.resolution_level,

    location_id: row.location_id,
    district_id: row.district_id,

    district_name: row.district_name,
    town_name: row.town_name,
    sub_county_name: row.sub_county_name,
    display_label: row.display_label,
    distance_meters: row.distance_meters,
    resolution_confidence:
      row.resolution_confidence != null && Number.isFinite(row.resolution_confidence)
        ? row.resolution_confidence
        : null,
    approximate_area_radius_meters:
      row.approximate_area_radius_meters != null &&
      Number.isFinite(row.approximate_area_radius_meters)
        ? row.approximate_area_radius_meters
        : null,

    is_precise: row.resolution_level === "exact_local",
    is_fallback:
      input.source === "cached_canonical" ||
      row.resolution_level === "district_only" ||
      row.resolution_level === "uganda_only",
  };

  return isStructurallyValidCanonicalLocation(normalized)
    ? normalized
    : null;
}

async function readCachedCanonicalLocation() {
  try {
    const cached = (await getCachedLocation()) as CanonicalResolvedLocation | null;
    return cached && isUsableCanonicalLocation(cached) ? cached : null;
  } catch {
    return null;
  }
}

async function persistCanonicalLocation(location: CanonicalResolvedLocation) {
  if (!shouldPersistCanonicalLocation(location)) {
    return;
  }

  try {
    await saveCachedLocation(location);
  } catch {
    // Cache failures must never block location resolution.
  }
}

function assertPostingLocation(location: CanonicalResolvedLocation | null) {
  if (!location) {
    throw new LocationResolveError(
      "location_unresolved",
      "We could not confirm your posting location.",
    );
  }

  if (!location.is_within_uganda || location.resolution_level === "outside_uganda") {
    throw new LocationResolveError(
      "outside_supported_country",
      "Posting is only supported inside Uganda.",
    );
  }

  if (isHardStale(location.resolved_at)) {
    throw new LocationResolveError(
      "posting_location_not_precise_enough",
      "Your posting location is too old. Please try again.",
    );
  }

  if (!isAllowedForPosting(location)) {
    throw new LocationResolveError(
      "posting_location_not_precise_enough",
      "We could not confirm your posting area precisely enough yet.",
    );
  }

  return location;
}

async function resolveLocationWithPolicy(
  options: ResolveLocationOptions,
): Promise<CanonicalResolvedLocation | null> {
  const cached = await readCachedCanonicalLocation();

  const freshCached =
    cached && isWithinMaxAge(cached.resolved_at, options.freshCacheMaxAgeMs)
      ? cached
      : null;

  if (!options.requireFresh && freshCached) {
    return toCachedCanonical(freshCached);
  }

  const permission = await ensureLocationPermission();

  if (permission.allowed && !permission.servicesEnabled) {
    throw new LocationResolveError(
      "location_services_disabled",
      "Location services are disabled.",
    );
  }

  if (!permission.allowed) {
    if (!options.requireFresh && options.allowCachedFallback && cached) {
      return toCachedCanonical(cached);
    }

    throw new LocationResolveError(
      "permission_denied",
      "Location permission denied.",
    );
  }

  let coords: Awaited<ReturnType<typeof getBrowseCoordinates>>;
  try {
    coords =
      options.mode === "post"
        ? await getPostCoordinates()
        : await getBrowseCoordinates();
  } catch (error) {
    if (!options.requireFresh && options.allowCachedFallback && cached) {
      return toCachedCanonical(cached);
    }

    throw inferLocationErrorFromUnknown(error);
  }

  let canonical: CanonicalResolvedLocation | null = null;

  try {
    canonical = await resolveCanonicalFromRpc({
      source: coords.source,
      lat: coords.lat,
      lng: coords.lng,
      accuracy_meters: coords.accuracy ?? null,
      mode: options.mode,
    });
  } catch (error) {
    if (!options.requireFresh && options.allowCachedFallback && cached) {
      return toCachedCanonical(cached);
    }

    throw toResolveError(
      "resolver_failed",
      "We could not resolve your location.",
      error,
    );
  }

  if (!canonical) {
    if (!options.requireFresh && options.allowCachedFallback && cached) {
      return toCachedCanonical(cached);
    }

    if (options.mode === "post") {
      throw new LocationResolveError(
        "location_unresolved",
        "We could not confirm your posting location.",
      );
    }

    return null;
  }

  await persistCanonicalLocation(canonical);
  return canonical;
}

/**
 * Browse/feed location:
 * - cache-first bootstrap
 * - browse resolver mode
 * - cached fallback allowed
 */
export async function resolveBrowseLocation(): Promise<CanonicalResolvedLocation | null> {
  return resolveLocationWithPolicy({
    mode: "browse",
    requireFresh: false,
    allowCachedFallback: true,
    freshCacheMaxAgeMs: BROWSE_CACHE_MAX_AGE_MS,
  });
}

/**
 * Post/job-creation location:
 * - fresh device fix required
 * - post resolver mode
 * - no cached fallback as the primary answer
 * - throws structured errors for UI mapping
 */
export async function resolvePostLocation(): Promise<CanonicalResolvedLocation> {
  const canonical = await resolveLocationWithPolicy({
    mode: "post",
    requireFresh: true,
    allowCachedFallback: false,
    freshCacheMaxAgeMs: 0,
  });

  return assertPostingLocation(canonical);
}

/**
 * Backward-compatible alias for existing feed code.
 * Keep feed code on this path. Do not use this for job posting.
 */
export async function resolveLocation(): Promise<CanonicalResolvedLocation | null> {
  return resolveBrowseLocation();
}