import * as Location from "expo-location";

export type LocationPermissionResult = {
  allowed: boolean;
  permissionStatus: Location.PermissionStatus;
  servicesEnabled: boolean;
  canAskAgain: boolean;
};

async function safeHasServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

function buildResult(
  permissionStatus: Location.PermissionStatus,
  servicesEnabled: boolean,
  canAskAgain: boolean,
): LocationPermissionResult {
  return {
    allowed: permissionStatus === Location.PermissionStatus.GRANTED,
    permissionStatus,
    servicesEnabled,
    canAskAgain,
  };
}

export async function ensureLocationPermission(): Promise<LocationPermissionResult> {
  const servicesEnabledBefore = await safeHasServicesEnabled();

  let current: Location.PermissionResponse;

  try {
    current = await Location.getForegroundPermissionsAsync();
  } catch {
    return buildResult(
      Location.PermissionStatus.UNDETERMINED,
      servicesEnabledBefore,
      true,
    );
  }

  if (current.status === Location.PermissionStatus.GRANTED) {
    return buildResult(
      current.status,
      await safeHasServicesEnabled(),
      current.canAskAgain,
    );
  }

  if (!current.canAskAgain) {
    return buildResult(
      current.status,
      servicesEnabledBefore,
      current.canAskAgain,
    );
  }

  let requested: Location.PermissionResponse;

  try {
    requested = await Location.requestForegroundPermissionsAsync();
  } catch {
    return buildResult(
      current.status,
      await safeHasServicesEnabled(),
      current.canAskAgain,
    );
  }

  return buildResult(
    requested.status,
    await safeHasServicesEnabled(),
    requested.canAskAgain,
  );
}