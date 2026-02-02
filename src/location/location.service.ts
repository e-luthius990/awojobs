import { ensureLocationPermission } from "./location.permissions";
import { getCoordinates } from "./location.coords";
import { reverseGeocode } from "./location.geocode";
import { resolveLocationId } from "./location.supabase";
import { updateProfileLocation } from "./location.profile";
import {
  getCachedLocation,
  saveCachedLocation,
  isLocationFresh,
} from "./location.cache";
import { ResolvedLocation } from "./location.types";

export async function resolveLocation(): Promise<ResolvedLocation | null> {
  /* ---------------------------------------------
     1) Cached location (manual always wins)
  ---------------------------------------------- */
  const cached = await getCachedLocation();
  if (cached && isLocationFresh(cached)) {
    return cached;
  }

  /* ---------------------------------------------
     2) GPS permission
  ---------------------------------------------- */
  const allowed = await ensureLocationPermission();
  if (!allowed) {
    // GPS denied → manual selector must be triggered by caller
    return cached ?? null;
  }

  /* ---------------------------------------------
     3) Coordinates
  ---------------------------------------------- */
  const coords = await getCoordinates();
  if (!coords) {
    return cached ?? null;
  }

  /* ---------------------------------------------
     4) Reverse geocode
  ---------------------------------------------- */
  const geo = await reverseGeocode(coords.lat, coords.lng);
  if (!geo) {
    return cached ?? null;
  }

  /* ---------------------------------------------
     5) Resolve location ID
  ---------------------------------------------- */
  let location_id: string | null = null;

  try {
    location_id = await resolveLocationId(
      geo.country,
      geo.district,
      geo.town,
      geo.sub_county,
      coords.lat,
      coords.lng,
    );
  } catch (err) {
    console.warn("[location] resolveLocationId failed", err);
  }

  // No DB match → force manual selector
  if (!location_id) {
    return cached ?? null;
  }

  /* ---------------------------------------------
     6) Build resolved location (GPS)
  ---------------------------------------------- */
  const resolved: ResolvedLocation = {
    location_id,
    country: geo.country,
    district: geo.district,
    town: geo.town,
    sub_county: geo.sub_county,
    lat: coords.lat,
    lng: coords.lng,
    source: "gps",
    resolved_at: Date.now(),
  };

  /* ---------------------------------------------
     7) Persist (best-effort)
  ---------------------------------------------- */
  try {
    await saveCachedLocation(resolved);

    // Only update profile if user is logged in (employer)
    await updateProfileLocation(location_id, coords.lat, coords.lng);
  } catch (err) {
    console.warn("[location] persist failed", err);
  }

  return resolved;
}
