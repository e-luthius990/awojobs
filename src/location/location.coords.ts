import * as Location from "expo-location";

export async function getCoordinates(): Promise<
  { lat: number; lng: number } | null
> {
  // 1. Ensure location services are ON
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return null;
  }

  // 2. Request permission (CRITICAL)
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    return null;
  }

  // 3. Try live location
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced, // correct for emulator
    });

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
  } catch {
    // 4. Fallback to last known
    const last = await Location.getLastKnownPositionAsync();
    if (!last) return null;

    return {
      lat: last.coords.latitude,
      lng: last.coords.longitude,
    };
  }
}
