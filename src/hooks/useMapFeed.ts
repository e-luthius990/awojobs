import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Region } from "react-native-maps";
import { fetchMapFeed } from "../jobs/jobs.map.service";
import type { ResolvedLocation } from "../location/location.types";

type MapItem = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  display_label: string | null;
  resolution_level: "exact_local" | "area_local" | "district_only" | null;
  map_visibility_mode:
    | "exact_pin"
    | "offset_pin"
    | "area_circle"
    | "district_anchor"
    | "hidden"
    | null;
  radius_meters?: number | null;
};

type Args = {
  resolvedLocation: ResolvedLocation | null;
  requestedScope: "local" | "national";
  enabled: boolean;
};

const AUTO_REFRESH_MS = 30_000;

function sameRegion(a: Region | null, b: Region | null) {
  if (!a || !b) return false;

  return (
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.latitudeDelta === b.latitudeDelta &&
    a.longitudeDelta === b.longitudeDelta
  );
}

function buildInitialRegion(
  resolvedLocation: ResolvedLocation | null,
): Region | null {
  if (!resolvedLocation) return null;

  return {
    latitude: resolvedLocation.lat,
    longitude: resolvedLocation.lng,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };
}

export function useMapFeed({
  resolvedLocation,
  requestedScope,
  enabled,
}: Args) {
  const [items, setItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const requestIdRef = useRef(0);
  const initialLoadDoneRef = useRef(false);
  const regionRef = useRef<Region | null>(null);

  const initialRegion = useMemo(
    () => buildInitialRegion(resolvedLocation),
    [resolvedLocation],
  );

  const [region, setRegionState] = useState<Region | null>(initialRegion);

  useEffect(() => {
    regionRef.current = region;
  }, [region]);

  useEffect(() => {
    if (!enabled) return;

    if (!initialRegion) {
      setRegionState(null);
      regionRef.current = null;
      return;
    }

    setRegionState((current) => {
      if (!current) return initialRegion;
      if (sameRegion(current, initialRegion)) return current;
      return initialRegion;
    });
  }, [enabled, initialRegion]);

  const setRegion = useCallback((next: Region) => {
    setRegionState((current) => {
      if (sameRegion(current, next)) return current;
      return next;
    });
  }, []);

  const runFetch = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      if (!enabled) {
        setLoading(false);
        setRefreshing(false);
        setError(null);
        return;
      }

      const effectiveRegion = regionRef.current ?? initialRegion;

      if (!effectiveRegion) {
        setLoading(false);
        setRefreshing(false);
        setError(null);
        return;
      }

      const requestId = ++requestIdRef.current;
      const hasExistingItems = items.length > 0;

      if (mode === "initial" && !hasExistingItems) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      const result = await fetchMapFeed({
        locationId: resolvedLocation?.location_id ?? null,
        districtId: resolvedLocation?.district_id ?? null,
        requestedScope,
        north: effectiveRegion.latitude + effectiveRegion.latitudeDelta / 2,
        south: effectiveRegion.latitude - effectiveRegion.latitudeDelta / 2,
        east: effectiveRegion.longitude + effectiveRegion.longitudeDelta / 2,
        west: effectiveRegion.longitude - effectiveRegion.longitudeDelta / 2,
        zoom: 13,
        limit: 100,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!result.ok) {
        setError(result.error.message);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setItems(result.data.items);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      setLastUpdatedAt(Date.now());
      initialLoadDoneRef.current = true;
    },
    [enabled, initialRegion, requestedScope, resolvedLocation, items.length],
  );

  const refresh = useCallback(async () => {
    await runFetch(initialLoadDoneRef.current ? "refresh" : "initial");
  }, [runFetch]);

  useEffect(() => {
    if (!enabled) return;
    if (initialLoadDoneRef.current) return;

    void runFetch("initial");
  }, [enabled, runFetch]);

  useEffect(() => {
    if (!enabled) return;
    if (!initialLoadDoneRef.current) return;

    void runFetch("refresh");
  }, [requestedScope, enabled, runFetch]);

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      void runFetch("refresh");
    }, AUTO_REFRESH_MS);

    return () => clearInterval(timer);
  }, [enabled, runFetch]);

  return {
    items,
    loading,
    refreshing,
    error,
    refresh,
    region,
    setRegion,
    lastUpdatedAt,
  };
}