import { ResolvedLocation } from "./location.types";
import {
  getCachedLocation,
  saveCachedLocation,
} from "./location.cache";
import { getManualLocation } from "./manual-location.cache";
import { ensureLocationPermission } from "./location.permissions";
import { getCoordinates } from "./location.coords";
import { resolveLocationFromCoords } from "./location.rpc";

export async function resolveLocation(): Promise<ResolvedLocation | null> {
  /* 1️⃣ FAST CACHE */
  const cached = await getCachedLocation();
  if (cached) return cached;

  /* 2️⃣ GPS */
  const allowed = await ensureLocationPermission();

  if (allowed) {
    try {
      const coords = await getCoordinates();

      const resolved = await resolveLocationFromCoords(
        coords.lat,
        coords.lng
      );

      if (resolved) {
        const location: ResolvedLocation = {
          source: "gps",
          location_id: resolved.location_id,
          lat: coords.lat,
          lng: coords.lng,
          resolved_at: Date.now(),
        };

        await saveCachedLocation(location);
        return location;
      }
    } catch {
      // silent fail → fallback
    }
  }

  /* 3️⃣ MANUAL FALLBACK */
  const manual = await getManualLocation();

  if (manual?.location_id) {
    const location: ResolvedLocation = {
      source: "manual",
      location_id: manual.location_id,
      lat: null,
      lng: null,
      resolved_at: Date.now(),
    };

    await saveCachedLocation(location);
    return location;
  }

  return null;
}
