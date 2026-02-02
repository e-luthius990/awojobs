import { getCachedLocation } from "./location.cache";
import { ResolvedLocation } from "./location.types";

export async function getCurrentLocation(): Promise<ResolvedLocation | null> {
  return await getCachedLocation();
}
