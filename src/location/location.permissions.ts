import * as Location from "expo-location";

export async function ensureLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();

  if (current.status === "granted") {
    return true;
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.status === "granted";
}