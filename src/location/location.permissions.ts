import * as Location from "expo-location";

export async function ensureLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();

  if (status === "granted") return true;

  const req = await Location.requestForegroundPermissionsAsync();
  return req.status === "granted";
}
