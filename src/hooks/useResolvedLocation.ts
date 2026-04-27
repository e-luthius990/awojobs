import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { resolveBrowseLocation } from "@location/location.service";
import type { ResolvedLocation } from "@location/location.types";

type LocationStatus =
  | "idle"
  | "resolving"
  | "resolved_exact"
  | "resolved_area"
  | "resolved_district"
  | "uganda_only"
  | "outside_uganda"
  | "permission_denied"
  | "services_disabled"
  | "unavailable"
  | "failed"
  | "stale_fallback";

type ResolveOptions = {
  silent?: boolean;
};

type CanonicalResolutionLevel =
  | "exact_local"
  | "area_local"
  | "district_only"
  | "uganda_only"
  | "outside_uganda";

type CachedLocationState = {
  resolvedLocation: ResolvedLocation | null;
  status: LocationStatus;
  permissionDenied: boolean;
  servicesDisabled: boolean;
  error: string | null;
  bootstrapped: boolean;
};

const locationCache: CachedLocationState = {
  resolvedLocation: null,
  status: "idle",
  permissionDenied: false,
  servicesDisabled: false,
  error: null,
  bootstrapped: false,
};

function writeLocationCache(next: Partial<CachedLocationState>) {
  if ("resolvedLocation" in next) {
    locationCache.resolvedLocation = next.resolvedLocation ?? null;
  }

  if ("status" in next && next.status) {
    locationCache.status = next.status;
  }

  if ("permissionDenied" in next && typeof next.permissionDenied === "boolean") {
    locationCache.permissionDenied = next.permissionDenied;
  }

  if ("servicesDisabled" in next && typeof next.servicesDisabled === "boolean") {
    locationCache.servicesDisabled = next.servicesDisabled;
  }

  if ("error" in next) {
    locationCache.error = next.error ?? null;
  }

  if ("bootstrapped" in next && typeof next.bootstrapped === "boolean") {
    locationCache.bootstrapped = next.bootstrapped;
  }
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";

  return "message" in error && typeof error.message === "string"
    ? error.message.toLowerCase()
    : "";
}

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";

  return "code" in error && typeof error.code === "string"
    ? error.code.toLowerCase()
    : "";
}

function isPermissionDeniedError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);

  return (
    message.includes("permission") ||
    message.includes("denied") ||
    code === "permission_denied" ||
    code === "e_location_permission_denied"
  );
}

function isServicesDisabledError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);

  return (
    message.includes("location services") ||
    message.includes("services disabled") ||
    message.includes("gps is disabled") ||
    code === "location_services_disabled" ||
    code === "e_location_services_disabled"
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function getResolutionLevel(value: unknown): CanonicalResolutionLevel | null {
  if (!isObject(value)) return null;

  const level = readString(value.resolution_level);

  if (
    level === "exact_local" ||
    level === "area_local" ||
    level === "district_only" ||
    level === "uganda_only" ||
    level === "outside_uganda"
  ) {
    return level;
  }

  const withinUganda = readBoolean(value.is_within_uganda);
  if (withinUganda === false) {
    return "outside_uganda";
  }

  return null;
}

function getCanonicalDisplayLabel(value: unknown): string | null {
  if (!isObject(value)) return null;
  return readString(value.display_label);
}

function hasCanonicalLocationId(value: unknown): boolean {
  if (!isObject(value)) return false;
  return readString(value.location_id) !== null;
}

function hasCanonicalDistrictId(value: unknown): boolean {
  if (!isObject(value)) return false;
  return readString(value.district_id) !== null;
}

function isUsableResolvedLocation(
  value: unknown,
): value is ResolvedLocation & {
  resolution_level: CanonicalResolutionLevel;
  display_label?: string | null;
  location_id?: string | null;
  district_id?: string | null;
  is_within_uganda?: boolean;
  source?: string | null;
  is_precise?: boolean;
  is_fallback?: boolean;
} {
  if (!isObject(value)) return false;

  const level = getResolutionLevel(value);
  if (!level) return false;

  if (level === "outside_uganda") return true;
  if (level === "uganda_only") return true;

  if (level === "exact_local" || level === "area_local") {
    return hasCanonicalLocationId(value) && hasCanonicalDistrictId(value);
  }

  if (level === "district_only") {
    return hasCanonicalDistrictId(value);
  }

  return false;
}

function getUserFacingError(status: LocationStatus): string | null {
  switch (status) {
    case "permission_denied":
      return "Location permission is off.";
    case "services_disabled":
      return "Device location services are off.";
    case "outside_uganda":
      return "AwoJobs nearby works only within Uganda.";
    case "uganda_only":
      return "We found Uganda, but not your nearby district yet.";
    case "unavailable":
      return "We could not match your current area yet.";
    case "failed":
      return "We could not refresh your current area.";
    default:
      return null;
  }
}

export function useResolvedLocation() {
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(
    locationCache.resolvedLocation,
  );
  const [loading, setLoading] = useState(!locationCache.bootstrapped);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<LocationStatus>(locationCache.status);
  const [permissionDenied, setPermissionDenied] = useState(
    locationCache.permissionDenied,
  );
  const [servicesDisabled, setServicesDisabled] = useState(
    locationCache.servicesDisabled,
  );
  const [error, setError] = useState<string | null>(locationCache.error);

  const mountedRef = useRef(false);
  const resolvingRef = useRef(false);
  const bootstrappedRef = useRef(locationCache.bootstrapped);
  const requestIdRef = useRef(0);
  const resolvedLocationRef = useRef<ResolvedLocation | null>(
    locationCache.resolvedLocation,
  );

  const runResolve = useCallback(async (options?: ResolveOptions) => {
    if (resolvingRef.current) return;

    resolvingRef.current = true;
    const requestId = ++requestIdRef.current;
    const firstLoad = !bootstrappedRef.current;
    const silent = options?.silent === true;
    const previousLocation = resolvedLocationRef.current;

    if (mountedRef.current) {
      if (firstLoad && !previousLocation) {
        setLoading(true);
        setRefreshing(false);
        setStatus("resolving");
        setError(null);
      } else if (silent || previousLocation) {
        setRefreshing(true);
      } else {
        setRefreshing(true);
        setStatus("resolving");
        setError(null);
      }
    }

    try {
      const fresh = await resolveBrowseLocation();

      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      bootstrappedRef.current = true;
      writeLocationCache({ bootstrapped: true });

      if (!fresh || !isUsableResolvedLocation(fresh)) {
        setPermissionDenied(false);
        setServicesDisabled(false);
        writeLocationCache({
          permissionDenied: false,
          servicesDisabled: false,
        });

        if (previousLocation) {
          setStatus("stale_fallback");
          setError(null);
          setResolvedLocation(previousLocation);

          writeLocationCache({
            resolvedLocation: previousLocation,
            status: "stale_fallback",
            error: null,
          });
        } else {
          setResolvedLocation(null);
          setStatus("unavailable");
          setError(getUserFacingError("unavailable"));

          writeLocationCache({
            resolvedLocation: null,
            status: "unavailable",
            error: getUserFacingError("unavailable"),
          });
        }

        return;
      }

      const level = getResolutionLevel(fresh);
      const canonicalLabel = getCanonicalDisplayLabel(fresh);

      const normalized: ResolvedLocation = {
        ...fresh,
        resolution_level: level!,
        display_label: canonicalLabel,
      };

      resolvedLocationRef.current = normalized;
      setResolvedLocation(normalized);
      setPermissionDenied(false);
      setServicesDisabled(false);

      writeLocationCache({
        resolvedLocation: normalized,
        permissionDenied: false,
        servicesDisabled: false,
      });

      if (level === "outside_uganda") {
        setStatus("outside_uganda");
        setError(getUserFacingError("outside_uganda"));

        writeLocationCache({
          status: "outside_uganda",
          error: getUserFacingError("outside_uganda"),
        });
        return;
      }

      if (level === "uganda_only") {
        setStatus("uganda_only");
        setError(getUserFacingError("uganda_only"));

        writeLocationCache({
          status: "uganda_only",
          error: getUserFacingError("uganda_only"),
        });
        return;
      }

      if (level === "district_only") {
        setStatus("resolved_district");
        setError(null);

        writeLocationCache({
          status: "resolved_district",
          error: null,
        });
        return;
      }

      if (level === "area_local") {
        setStatus("resolved_area");
        setError(null);

        writeLocationCache({
          status: "resolved_area",
          error: null,
        });
        return;
      }

      setStatus("resolved_exact");
      setError(null);

      writeLocationCache({
        status: "resolved_exact",
        error: null,
      });
    } catch (err) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      bootstrappedRef.current = true;
      writeLocationCache({ bootstrapped: true });

      if (isPermissionDeniedError(err)) {
        setPermissionDenied(true);
        setServicesDisabled(false);

        if (previousLocation) {
          setResolvedLocation(previousLocation);
          setStatus("stale_fallback");
          setError(null);

          writeLocationCache({
            resolvedLocation: previousLocation,
            status: "stale_fallback",
            permissionDenied: true,
            servicesDisabled: false,
            error: null,
          });
        } else {
          setResolvedLocation(null);
          setStatus("permission_denied");
          setError(getUserFacingError("permission_denied"));

          writeLocationCache({
            resolvedLocation: null,
            status: "permission_denied",
            permissionDenied: true,
            servicesDisabled: false,
            error: getUserFacingError("permission_denied"),
          });
        }
      } else if (isServicesDisabledError(err)) {
        setPermissionDenied(false);
        setServicesDisabled(true);

        if (previousLocation) {
          setResolvedLocation(previousLocation);
          setStatus("stale_fallback");
          setError(null);

          writeLocationCache({
            resolvedLocation: previousLocation,
            status: "stale_fallback",
            permissionDenied: false,
            servicesDisabled: true,
            error: null,
          });
        } else {
          setResolvedLocation(null);
          setStatus("services_disabled");
          setError(getUserFacingError("services_disabled"));

          writeLocationCache({
            resolvedLocation: null,
            status: "services_disabled",
            permissionDenied: false,
            servicesDisabled: true,
            error: getUserFacingError("services_disabled"),
          });
        }
      } else {
        setPermissionDenied(false);
        setServicesDisabled(false);

        if (previousLocation) {
          setResolvedLocation(previousLocation);
          setStatus("stale_fallback");
          setError(null);

          writeLocationCache({
            resolvedLocation: previousLocation,
            status: "stale_fallback",
            permissionDenied: false,
            servicesDisabled: false,
            error: null,
          });
        } else {
          setResolvedLocation(null);
          setStatus("failed");
          setError(getUserFacingError("failed"));

          writeLocationCache({
            resolvedLocation: null,
            status: "failed",
            permissionDenied: false,
            servicesDisabled: false,
            error: getUserFacingError("failed"),
          });
        }
      }
    } finally {
      resolvingRef.current = false;

      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (locationCache.resolvedLocation) {
      void runResolve({ silent: true });
    } else {
      void runResolve();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [runResolve]);

  const retry = useCallback(() => {
    void runResolve();
  }, [runResolve]);

  const silentRefresh = useCallback(() => {
    void runResolve({ silent: true });
  }, [runResolve]);

  const resolutionLevel = useMemo(
    () => getResolutionLevel(resolvedLocation),
    [resolvedLocation],
  );

  const displayLabel = useMemo(
    () => getCanonicalDisplayLabel(resolvedLocation),
    [resolvedLocation],
  );

  const isWithinUganda = useMemo(() => {
    if (!resolvedLocation) return null;
    return resolvedLocation.is_within_uganda;
  }, [resolvedLocation]);

  const isDistrictFallback = resolutionLevel === "district_only";
  const isAreaLocal = resolutionLevel === "area_local";
  const isUgandaOnly = resolutionLevel === "uganda_only";
  const isPrecise = resolutionLevel === "exact_local";

  const canUseNearby =
    Boolean(resolvedLocation) &&
    isWithinUganda === true &&
    (
      resolutionLevel === "exact_local" ||
      resolutionLevel === "area_local" ||
      resolutionLevel === "district_only"
    );

  const coords = useMemo(() => {
    if (!resolvedLocation) return null;

    return {
      lat: resolvedLocation.lat,
      lng: resolvedLocation.lng,
      accuracy_meters: resolvedLocation.accuracy_meters,
    };
  }, [
    resolvedLocation?.lat,
    resolvedLocation?.lng,
    resolvedLocation?.accuracy_meters,
  ]);

  return {
    resolvedLocation,
    coords,
    loading,
    refreshing,
    status,
    permissionDenied,
    servicesDisabled,
    error,
    retry,
    silentRefresh,
    resolutionLevel,
    displayLabel,
    isWithinUganda,
    canUseNearby,
    isDistrictFallback,
    isAreaLocal,
    isUgandaOnly,
    isPrecise,
    isFallback:
      status === "stale_fallback" ||
      resolutionLevel === "district_only" ||
      resolutionLevel === "uganda_only",
    source: resolvedLocation?.source ?? null,
    isExactLocalReady: status === "resolved_exact",
    isAreaLocalReady: status === "resolved_area",
    isDistrictReady: status === "resolved_district",
    isStaleFallback: status === "stale_fallback",
  };
}