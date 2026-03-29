import * as Location from "expo-location";

export type LocationPermissionResult = {
  allowed: boolean;
  permissionStatus: Location.PermissionStatus;
  servicesEnabled: boolean;
  canAskAgain: boolean;
};

export async function ensureLocationPermission(): Promise<LocationPermissionResult> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();

  const current = await Location.getForegroundPermissionsAsync();

  if (current.status === "granted") {
    return {
      allowed: servicesEnabled,
      permissionStatus: current.status,
      servicesEnabled,
      canAskAgain: current.canAskAgain,
    };
  }

  if (!current.canAskAgain) {
    return {
      allowed: false,
      permissionStatus: current.status,
      servicesEnabled,
      canAskAgain: current.canAskAgain,
    };
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  const latestServicesEnabled = await Location.hasServicesEnabledAsync();

  return {
    allowed:
      requested.status === "granted" && latestServicesEnabled,
    permissionStatus: requested.status,
    servicesEnabled: latestServicesEnabled,
    canAskAgain: requested.canAskAgain,
  };
}