import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { resolveLocation } from "@location/location.service";
import { getCachedLocation } from "@location/location.cache";

const CHANGE_COOLDOWN_MS = 8000;

export function useResolvedLocation() {
  const [locationId, setLocationId] =
    useState<string | null>(null);
  const [locationLabel, setLocationLabel] =
    useState<string | null>(null);
  const [loading, setLoading] =
    useState(true);

  const [districtBannerVisible, setDistrictBannerVisible] =
    useState(false);
  const [bannerDistrictName, setBannerDistrictName] =
    useState<string | null>(null);

  const currentLocationIdRef =
    useRef<string | null>(null);

  const lastChangeRef = useRef<number>(0);
  const resolvingRef = useRef(false);
  const mountedRef = useRef(true);

  /* ---------------- INITIAL LOAD ---------------- */

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      /* ---------- FAST CACHE PAINT ---------- */

      try {
        const cached =
          await getCachedLocation();

        if (cached && mountedRef.current) {
          currentLocationIdRef.current =
            cached.location_id;

          setLocationId(
            cached.location_id
          );

          setLocationLabel(
            cached.district ?? null
          );

          setLoading(false);
        }
      } catch {
        // silent
      }

      /* ---------- BACKGROUND RESOLUTION ---------- */

      if (resolvingRef.current) return;

      resolvingRef.current = true;

      try {
        const fresh =
          await resolveLocation();

        if (
          !mountedRef.current ||
          !fresh
        )
          return;

        const newId =
          fresh.location_id;

        const newDistrict =
          fresh.district ?? null;

        const oldId =
          currentLocationIdRef.current;

        const now = Date.now();

        const hasChanged =
          oldId &&
          newId &&
          oldId !== newId;

        const cooldownPassed =
          now - lastChangeRef.current >
          CHANGE_COOLDOWN_MS;

        // Prevent redundant state updates
        if (newId !== oldId) {
          currentLocationIdRef.current =
            newId;

          setLocationId(newId);
          setLocationLabel(
            newDistrict
          );
        }

        if (
          hasChanged &&
          cooldownPassed
        ) {
          lastChangeRef.current =
            now;

          setBannerDistrictName(
            newDistrict
          );
          setDistrictBannerVisible(
            true
          );
        }
      } catch {
        // silent fail — fallback handled elsewhere
      } finally {
        resolvingRef.current = false;

        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---------------- STABLE HIDE HANDLER ---------------- */

  const hideDistrictBanner =
    useCallback(() => {
      setDistrictBannerVisible(false);
    }, []);

  return {
    locationId,
    locationLabel,
    loading,
    districtBannerVisible,
    bannerDistrictName,
    hideDistrictBanner,
  };
}
