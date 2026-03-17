import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { resolveLocation } from "@location/location.service";
import { getCachedLocation } from "@location/location.cache";

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
  > | null
): string | null {
  if (!location) return null;

  const parts = [
    location.sub_county?.trim(),
    location.town?.trim(),
    location.district?.trim(),
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : null;
}

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

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        const cached =
          (await getCachedLocation()) as ResolvedLocationShape | null;

        if (cached && mountedRef.current) {
          currentLocationIdRef.current =
            cached.location_id ?? null;

          setLocationId(cached.location_id ?? null);
          setLocationLabel(formatLocationLabel(cached));
          setLoading(false);
        }
      } catch {
        // silent
      }

      if (resolvingRef.current) return;
      resolvingRef.current = true;

      try {
        const fresh =
          (await resolveLocation()) as ResolvedLocationShape | null;

        if (!mountedRef.current || !fresh) return;

        const newId = fresh.location_id ?? null;
        const newLabel = formatLocationLabel(fresh);
        const newDistrict = fresh.district ?? null;

        const oldId = currentLocationIdRef.current;
        const now = Date.now();

        const hasChanged =
          !!oldId &&
          !!newId &&
          oldId !== newId;

        const cooldownPassed =
          now - lastChangeRef.current >
          CHANGE_COOLDOWN_MS;

        // Never downgrade a valid canonical location_id to null automatically.
        if (newId && newId !== oldId) {
          currentLocationIdRef.current = newId;
          setLocationId(newId);
        }

        // Still allow label refresh from fresher data.
        if (newLabel) {
          setLocationLabel(newLabel);
        }

        if (hasChanged && cooldownPassed) {
          lastChangeRef.current = now;
          setBannerDistrictName(newDistrict);
          setDistrictBannerVisible(true);
        }
      } catch {
        // silent fail
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