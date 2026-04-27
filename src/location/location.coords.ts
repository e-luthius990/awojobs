import * as Location from "expo-location";

const DEFAULT_LAST_KNOWN_MAX_AGE_MS = 2 * 60 * 1000;

const BROWSE_BOOTSTRAP_MAX_ACCURACY_METERS = 1500;
const BROWSE_TARGET_ACCURACY_METERS = 120;

/**
 * Important:
 * Do not make the app-layer stricter than the backend resolver.
 * Backend posting now allows up to 1500m and classifies:
 * - exact_local
 * - area_local
 * - district_only
 *
 * The app should still prefer good accuracy for posting,
 * but should not reject a usable live fix just because it
 * did not hit an over-tight 80m threshold in time.
 */
const POST_BOOTSTRAP_MAX_ACCURACY_METERS = 1500;
const POST_PREFERRED_ACCURACY_METERS = 80;
const POST_MAX_ACCEPTABLE_ACCURACY_METERS = 1500;

const BROWSE_WATCH_TIMEOUT_MS = 9000;
const POST_WATCH_TIMEOUT_MS = 15000;

export type CoordinatesSource =
  | "live_gps"
  | "live_fused"
  | "last_known_gps"
  | "last_known_fused";

export type CoordinatesResult = {
  lat: number;
  lng: number;
  accuracy: number | null;
  source: CoordinatesSource;
  timestamp: number | null;
};

export type GetCoordinatesOptions = {
  requireFresh?: boolean;
  allowLastKnownFallback?: boolean;
  lastKnownMaxAgeMs?: number;
  /**
   * Preferred accuracy target. If reached, we can stop early.
   * If not reached, we may still return the best live fix,
   * depending on maxAcceptableAccuracyMeters.
   */
  targetAccuracyMeters?: number;
  /**
   * Max allowed accuracy for bootstrap last-known candidate.
   */
  bootstrapLastKnownMaxAccuracyMeters?: number;
  /**
   * Max allowed final returned accuracy.
   * If omitted, targetAccuracyMeters is used.
   */
  maxAcceptableAccuracyMeters?: number;
  liveTimeoutMs?: number;
  watchAccuracy?: Location.Accuracy;
};

function hasValidFiniteCoords(
  coords: Partial<Location.LocationObjectCoords> | null | undefined,
): coords is Location.LocationObjectCoords {
  if (!coords) return false;

  return (
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude) &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    Number.isFinite(coords.longitude) &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

function isFreshEnough(
  timestamp: number | null | undefined,
  maxAgeMs: number,
): boolean {
  if (!timestamp || !Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= maxAgeMs;
}

function isUsableAccuracy(
  accuracy: number | null | undefined,
  maxAccuracyMeters: number,
): boolean {
  if (accuracy == null || !Number.isFinite(accuracy)) return false;
  return accuracy <= maxAccuracyMeters;
}

function classifyFixKind(
  location: Location.LocationObject | Location.LocationObjectCoords,
): "gps" | "fused" {
  const accuracy =
    "coords" in location
      ? (location.coords.accuracy ?? null)
      : (location.accuracy ?? null);

  if (accuracy != null && accuracy <= 35) {
    return "gps";
  }

  return "fused";
}

function mapLocationObject(
  location: Location.LocationObject,
  sourcePrefix: "live" | "last_known",
): CoordinatesResult | null {
  if (!hasValidFiniteCoords(location.coords)) {
    return null;
  }

  const fixKind = classifyFixKind(location);
  const source: CoordinatesSource =
    sourcePrefix === "live"
      ? fixKind === "gps"
        ? "live_gps"
        : "live_fused"
      : fixKind === "gps"
        ? "last_known_gps"
        : "last_known_fused";

  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy ?? null,
    source,
    timestamp: location.timestamp ?? Date.now(),
  };
}

function normalizeOptions(
  options?: GetCoordinatesOptions,
): Required<GetCoordinatesOptions> {
  const requireFresh = options?.requireFresh ?? false;
  const targetAccuracyMeters =
    options?.targetAccuracyMeters ??
    (requireFresh
      ? POST_PREFERRED_ACCURACY_METERS
      : BROWSE_TARGET_ACCURACY_METERS);

  const maxAcceptableAccuracyMeters =
    options?.maxAcceptableAccuracyMeters ?? targetAccuracyMeters;

  return {
    requireFresh,
    allowLastKnownFallback: options?.allowLastKnownFallback ?? !requireFresh,
    lastKnownMaxAgeMs:
      options?.lastKnownMaxAgeMs ?? DEFAULT_LAST_KNOWN_MAX_AGE_MS,
    targetAccuracyMeters,
    bootstrapLastKnownMaxAccuracyMeters:
      options?.bootstrapLastKnownMaxAccuracyMeters ??
      (requireFresh
        ? POST_BOOTSTRAP_MAX_ACCURACY_METERS
        : BROWSE_BOOTSTRAP_MAX_ACCURACY_METERS),
    maxAcceptableAccuracyMeters,
    liveTimeoutMs:
      options?.liveTimeoutMs ??
      (requireFresh ? POST_WATCH_TIMEOUT_MS : BROWSE_WATCH_TIMEOUT_MS),
    watchAccuracy:
      options?.watchAccuracy ??
      (requireFresh ? Location.Accuracy.Highest : Location.Accuracy.High),
  };
}

async function ensureForegroundPermission(): Promise<void> {
  const current = await Location.getForegroundPermissionsAsync();

  if (current.granted) return;

  const requested = await Location.requestForegroundPermissionsAsync();

  if (!requested.granted) {
    throw new Error("LOCATION_PERMISSION_DENIED");
  }
}

async function ensureLocationServicesEnabled(): Promise<void> {
  const enabled = await Location.hasServicesEnabledAsync();

  if (!enabled) {
    throw new Error("LOCATION_SERVICES_DISABLED");
  }
}

async function getSafeLastKnownPosition(
  maxAgeMs: number,
  requiredAccuracy: number,
): Promise<Location.LocationObject | null> {
  try {
    return await Location.getLastKnownPositionAsync({
      maxAge: maxAgeMs,
      requiredAccuracy,
    });
  } catch {
    return null;
  }
}

function getAcceptedLastKnown(
  location: Location.LocationObject | null,
  maxAgeMs: number,
  maxAccuracyMeters: number,
): CoordinatesResult | null {
  if (!location) return null;
  if (!hasValidFiniteCoords(location.coords)) return null;
  if (!isFreshEnough(location.timestamp ?? null, maxAgeMs)) return null;
  if (!isUsableAccuracy(location.coords.accuracy ?? null, maxAccuracyMeters)) {
    return null;
  }

  return mapLocationObject(location, "last_known");
}

function pickMorePrecise(
  current: CoordinatesResult | null,
  candidate: CoordinatesResult | null,
): CoordinatesResult | null {
  if (!candidate) return current;
  if (!current) return candidate;

  const currentAccuracy =
    current.accuracy != null && Number.isFinite(current.accuracy)
      ? current.accuracy
      : Number.POSITIVE_INFINITY;

  const candidateAccuracy =
    candidate.accuracy != null && Number.isFinite(candidate.accuracy)
      ? candidate.accuracy
      : Number.POSITIVE_INFINITY;

  return candidateAccuracy < currentAccuracy ? candidate : current;
}

function watchForBestFix(
  watchAccuracy: Location.Accuracy,
  timeoutMs: number,
  targetAccuracyMeters: number,
): Promise<CoordinatesResult | null> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let subscription: Location.LocationSubscription | null = null;
    let best: CoordinatesResult | null = null;

    const finish = (value: CoordinatesResult | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      resolve(value);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      reject(error);
    };

    const timer = setTimeout(() => {
      finish(best);
    }, timeoutMs);

    Location.watchPositionAsync(
      {
        accuracy: watchAccuracy,
        timeInterval: 1000,
        distanceInterval: 0,
        mayShowUserSettingsDialog: true,
      },
      (location) => {
        const mapped = mapLocationObject(location, "live");
        best = pickMorePrecise(best, mapped);

        const accuracy = mapped?.accuracy ?? null;
        if (accuracy != null && accuracy <= targetAccuracyMeters) {
          finish(mapped);
        }
      },
    )
      .then((sub) => {
        subscription = sub;
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "LOCATION_WATCH_FAILED";
        fail(new Error(message));
      });
  });
}

function isPermissionLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();

  return (
    message.includes("denied") ||
    message.includes("permission") ||
    message.includes("not authorized")
  );
}

function isServicesLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();

  return (
    message.includes("services disabled") ||
    message.includes("location services disabled") ||
    message.includes("gps is disabled")
  );
}

export async function getCoordinates(
  options?: GetCoordinatesOptions,
): Promise<CoordinatesResult> {
  const resolved = normalizeOptions(options);

  await ensureForegroundPermission();
  await ensureLocationServicesEnabled();

  const lastKnown = await getSafeLastKnownPosition(
    resolved.lastKnownMaxAgeMs,
    resolved.bootstrapLastKnownMaxAccuracyMeters,
  );

  const acceptedLastKnown = getAcceptedLastKnown(
    lastKnown,
    resolved.lastKnownMaxAgeMs,
    resolved.bootstrapLastKnownMaxAccuracyMeters,
  );

  if (!resolved.requireFresh && acceptedLastKnown) {
    return acceptedLastKnown;
  }

  let liveBest: CoordinatesResult | null = null;

  try {
    liveBest = await watchForBestFix(
      resolved.watchAccuracy,
      resolved.liveTimeoutMs,
      resolved.targetAccuracyMeters,
    );
  } catch (error) {
    if (isPermissionLikeError(error)) {
      throw new Error("LOCATION_PERMISSION_DENIED");
    }

    if (isServicesLikeError(error)) {
      throw new Error("LOCATION_SERVICES_DISABLED");
    }

    if (resolved.allowLastKnownFallback && acceptedLastKnown) {
      return acceptedLastKnown;
    }

    throw error instanceof Error
      ? error
      : new Error("LOCATION_UNAVAILABLE");
  }

  if (
    liveBest &&
    isUsableAccuracy(liveBest.accuracy, resolved.maxAcceptableAccuracyMeters)
  ) {
    return liveBest;
  }

  if (resolved.allowLastKnownFallback && acceptedLastKnown) {
    return acceptedLastKnown;
  }

  if (liveBest) {
    throw new Error("LOCATION_WEAK_ACCURACY");
  }

  throw new Error("LOCATION_UNAVAILABLE");
}

export async function getBrowseCoordinates(): Promise<CoordinatesResult> {
  return getCoordinates({
    requireFresh: false,
    allowLastKnownFallback: true,
    lastKnownMaxAgeMs: DEFAULT_LAST_KNOWN_MAX_AGE_MS,
    bootstrapLastKnownMaxAccuracyMeters: BROWSE_BOOTSTRAP_MAX_ACCURACY_METERS,
    targetAccuracyMeters: BROWSE_TARGET_ACCURACY_METERS,
    maxAcceptableAccuracyMeters: BROWSE_BOOTSTRAP_MAX_ACCURACY_METERS,
    liveTimeoutMs: BROWSE_WATCH_TIMEOUT_MS,
    watchAccuracy: Location.Accuracy.High,
  });
}

export async function getPostCoordinates(): Promise<CoordinatesResult> {
  return getCoordinates({
    requireFresh: true,
    allowLastKnownFallback: false,
    lastKnownMaxAgeMs: 60 * 1000,
    bootstrapLastKnownMaxAccuracyMeters: POST_BOOTSTRAP_MAX_ACCURACY_METERS,
    targetAccuracyMeters: POST_PREFERRED_ACCURACY_METERS,
    maxAcceptableAccuracyMeters: POST_MAX_ACCEPTABLE_ACCURACY_METERS,
    liveTimeoutMs: POST_WATCH_TIMEOUT_MS,
    watchAccuracy: Location.Accuracy.Highest,
  });
}