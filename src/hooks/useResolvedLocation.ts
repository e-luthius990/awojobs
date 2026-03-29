import { useEffect, useRef, useState, useCallback } from "react";
import { resolveLocation } from "@location/location.service";

const CHANGE_COOLDOWN_MS = 8000;

type ResolvedLocationShape = {
  location_id: string | null;
  district?: string | null;
  town?: string | null;
  sub_county?: string | null;
};

function formatLocationLabel(
  location: Pick<
    ResolvedLocationShape,
    "district" | "town" | "sub_county"
  > | null,
): string | null {
  if (!location) return null;

  const parts = [
    location.sub_county?.trim(),
    location.town?.trim(),
    location.district?.trim(),
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : null;
}

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  const code =
    "code" in error && typeof error.code === "string"
      ? error.code.toLowerCase()
      : "";

  return (
    message.includes("permission") ||
    message.includes("denied") ||
    message.includes("location services") ||
    code === "permission_denied" ||
    code === "e_location_permission_denied"
  );
}

export function useResolvedLocation() {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [districtBannerVisible, setDistrictBannerVisible] = useState(false);
  const [bannerDistrictName, setBannerDistrictName] = useState<string | null>(
    null,
  );

  const currentLocationIdRef = useRef<string | null>(null);
  const lastChangeRef = useRef<number>(0);
  const resolvingRef = useRef(false);
  const mountedRef = useRef(true);

  const clearResolvedLocation = useCallback(() => {
    currentLocationIdRef.current = null;
    setLocationId(null);
    setLocationLabel(null);
  }, []);

  const applyResolvedLocation = useCallback(
    (fresh: ResolvedLocationShape | null) => {
      if (!mountedRef.current || !fresh?.location_id) return;

      const newId = fresh.location_id;
      const newLabel = formatLocationLabel(fresh);
      const newDistrict = fresh.district ?? null;

      const oldId = currentLocationIdRef.current;
      const now = Date.now();

      const hasChanged = Boolean(oldId && oldId !== newId);
      const cooldownPassed = now - lastChangeRef.current > CHANGE_COOLDOWN_MS;

      if (newId !== oldId) {
        currentLocationIdRef.current = newId;
        setLocationId(newId);
      }

      setLocationLabel(newLabel);

      if (hasChanged && cooldownPassed) {
        lastChangeRef.current = now;
        setBannerDistrictName(newDistrict);
        setDistrictBannerVisible(true);
      }

      setPermissionDenied(false);
      setError(null);
    },
    [],
  );

  const runResolve = useCallback(async () => {
    if (resolvingRef.current) return;

    resolvingRef.current = true;

    if (mountedRef.current) {
      setLoading(true);
    }

    try {
      const fresh = (await resolveLocation()) as ResolvedLocationShape | null;

      if (!mountedRef.current) return;

      if (!fresh?.location_id) {
        clearResolvedLocation();
        setPermissionDenied(false);
        setError("Turn on location to view jobs.");
        return;
      }

      applyResolvedLocation(fresh);
    } catch (err) {
      if (!mountedRef.current) return;

      clearResolvedLocation();

      if (isPermissionDeniedError(err)) {
        setPermissionDenied(true);
        setError("Turn on location to view jobs. Permission is off.");
      } else {
        setPermissionDenied(false);
        setError("Turn on location to view jobs.");
      }
    } finally {
      resolvingRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [applyResolvedLocation, clearResolvedLocation]);

  useEffect(() => {
    mountedRef.current = true;
    void runResolve();

    return () => {
      mountedRef.current = false;
    };
  }, [runResolve]);

  const hideDistrictBanner = useCallback(() => {
    setDistrictBannerVisible(false);
  }, []);

  const retry = useCallback(() => {
    void runResolve();
  }, [runResolve]);

  return {
    locationId,
    locationLabel,
    loading,
    permissionDenied,
    error,
    retry,
    districtBannerVisible,
    bannerDistrictName,
    hideDistrictBanner,
  };
}