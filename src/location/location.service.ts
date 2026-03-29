import { ResolvedLocation } from "./location.types";
import {
  getCachedLocation,
  saveCachedLocation,
} from "./location.cache";
import { ensureLocationPermission } from "./location.permissions";
import { getCoordinates } from "./location.coords";
import { resolveLocationFromCoords } from "./location.rpc";

const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

function isFresh(resolvedAt?: number | null) {
  return !!resolvedAt && Date.now() - resolvedAt < CACHE_MAX_AGE_MS;
}

export async function resolveLocation(): Promise<ResolvedLocation | null> {
  let cached: ResolvedLocation | null = null;

  try {
    cached = await getCachedLocation();
  } catch {
    cached = null;
  }

  const permission = await ensureLocationPermission();

  if (!permission.allowed) {
    return null;
  }

  try {
    const coords = await getCoordinates();
    const resolved = await resolveLocationFromCoords(coords.lat, coords.lng);

    if (resolved?.location_id) {
      const gpsLocation: ResolvedLocation = {
        source: "gps",
        location_id: resolved.location_id,
        district: resolved.district ?? null,
        town: resolved.town ?? null,
        sub_county: resolved.sub_county ?? null,
        lat: coords.lat,
        lng: coords.lng,
        resolved_at: Date.now(),
      };

      await saveCachedLocation(gpsLocation);
      return gpsLocation;
    }
  } catch {
    // fall through to fresh cache fallback
  }

  if (cached?.location_id && isFresh(cached.resolved_at)) {
    return cached;
  }

  return null;
}