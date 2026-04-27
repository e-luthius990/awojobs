import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CompositeNavigationProp,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import FeedView from "./FeedView";
import FeedMapView from "@ui/components/feed/FeedMapView";
import { useResolvedLocation } from "@hooks/useResolvedLocation";
import { useEdgeFeed } from "@hooks/useEdgeFeed";
import { useMapFeed } from "@hooks/useMapFeed";
import { useDailyPulse } from "@hooks/useDailyPulse";
import { useSession } from "@state/useSession";

import type { FeedStackParamList } from "../../navigation/FeedNavigator";
import type { RootStackParamList } from "../../navigation/RootNavigator";

type FeedNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<FeedStackParamList, "Feed">,
  NativeStackNavigationProp<RootStackParamList>
>;

type FeedScope = "local" | "national";
type FeedMode = "list" | "map";

type FeedLocationDisplay = {
  badgeLabel: string | null;
  badgeTone: "success" | "warning" | "info" | "error" | "default";
  title: string | null;
  subtitle: string | null;
};

function buildFeedLocationDisplay(args: {
  effectiveScope: FeedScope;
  locationStatus:
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
  resolutionLevel:
    | "exact_local"
    | "area_local"
    | "district_only"
    | "uganda_only"
    | "outside_uganda"
    | null;
  locationLabel: string | null;
  coverageNote: string | null;
  isPreciseLocation: boolean;
  isAreaLocation: boolean;
  hasValidLocation: boolean;
}): FeedLocationDisplay {
  const {
    effectiveScope,
    locationStatus,
    resolutionLevel,
    locationLabel,
    coverageNote,
    isPreciseLocation,
    isAreaLocation,
    hasValidLocation,
  } = args;

  if (effectiveScope === "national") {
    return {
      badgeLabel: "National",
      badgeTone: "info",
      title: locationLabel ?? "Uganda",
      subtitle: "Showing jobs across Uganda.",
    };
  }

  if (locationStatus === "permission_denied") {
    return {
      badgeLabel: "Permission needed",
      badgeTone: "warning",
      title: "Location access is off",
      subtitle: "Allow location access to see nearby jobs.",
    };
  }

  if (locationStatus === "services_disabled") {
    return {
      badgeLabel: "Services off",
      badgeTone: "warning",
      title: "Location services are off",
      subtitle: "Turn on device location services to see nearby jobs.",
    };
  }

  if (
    locationStatus === "outside_uganda" ||
    resolutionLevel === "outside_uganda"
  ) {
    return {
      badgeLabel: "Outside Uganda",
      badgeTone: "warning",
      title: "Location unavailable",
      subtitle: "Nearby jobs are only available inside Uganda.",
    };
  }

  if (locationStatus === "uganda_only" || resolutionLevel === "uganda_only") {
    return {
      badgeLabel: "Locating district",
      badgeTone: "warning",
      title: "Uganda",
      subtitle: "We found Uganda, but not your district yet.",
    };
  }

  if (locationStatus === "resolving" || locationStatus === "stale_fallback") {
    return {
      badgeLabel: "Refreshing area",
      badgeTone: "warning",
      title: locationLabel ?? "Finding your area",
      subtitle: coverageNote ?? "We are refreshing your nearby area.",
    };
  }

  if (resolutionLevel === "district_only") {
    return {
      badgeLabel: "District",
      badgeTone: "warning",
      title: locationLabel,
      subtitle:
        coverageNote ??
        (locationLabel
          ? `Showing jobs across ${locationLabel}.`
          : "Showing jobs across your district."),
    };
  }

  if (isPreciseLocation && hasValidLocation) {
    return {
      badgeLabel: "Nearby",
      badgeTone: "success",
      title: locationLabel,
      subtitle: coverageNote ?? "Showing jobs near your current area.",
    };
  }

  if (isAreaLocation && hasValidLocation) {
    return {
      badgeLabel: "Nearby area",
      badgeTone: "info",
      title: locationLabel,
      subtitle: coverageNote ?? "Showing jobs around your current area.",
    };
  }

  return {
    badgeLabel: "Nearby",
    badgeTone: "default",
    title: locationLabel,
    subtitle: coverageNote ?? null,
  };
}

export default function FeedScreen() {
  const navigation = useNavigation<FeedNavigationProp>();

  const { session } = useSession();
  const isGuest = !session;

  const {
    resolvedLocation,
    loading: locationLoading,
    refreshing: locationRefreshing,
    retry: retryResolveLocation,
    silentRefresh: silentRefreshLocation,
    permissionDenied,
    servicesDisabled,
    error: locationError,
    status: locationStatus,
    resolutionLevel,
    displayLabel: resolvedDisplayLabel,
    isWithinUganda,
    canUseNearby,
    isDistrictFallback,
    isAreaLocal,
  } = useResolvedLocation();

  const [requestedScope, setRequestedScope] = useState<FeedScope>("local");
  const [viewMode, setViewMode] = useState<FeedMode>("list");

  const {
    jobs,
    loading: feedLoading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    premium,
    new_jobs_count,
    error,
    refreshing: feedRefreshing,
    effectiveScope,
    resolutionLevel: feedResolutionLevel,
    displayLocationLabel,
    coverageNote,
  } = useEdgeFeed(resolvedLocation, requestedScope);

  const isPremium = premium?.active === true;
  const canUseNational = !isGuest && isPremium;
  const isNationalLocked = !isGuest && !isPremium;

  useEffect(() => {
    if (requestedScope === "national" && !canUseNational) {
      setRequestedScope("local");
    }
  }, [requestedScope, canUseNational]);

  const locationRequired =
    requestedScope === "local" && !locationLoading && !canUseNearby;

  const mapEnabled = !locationRequired && !!resolvedLocation;

  const {
    items: mapItems,
    loading: mapLoading,
    refreshing: mapRefreshing,
    error: mapError,
    region,
    setRegion,
    refresh: refreshMap,
  } = useMapFeed({
    resolvedLocation,
    requestedScope,
    enabled: mapEnabled,
  });

  const refreshing =
    locationRefreshing || (viewMode === "map" ? mapRefreshing : feedRefreshing);

  const isInitialLoading = useMemo(() => {
    if (viewMode === "map") {
      return mapLoading && mapItems.length === 0;
    }

    if (requestedScope === "local") {
      if (locationLoading && jobs.length === 0) return true;
      if (locationRequired) return false;
      return feedLoading && jobs.length === 0;
    }

    return feedLoading && jobs.length === 0;
  }, [
    viewMode,
    mapLoading,
    mapItems.length,
    requestedScope,
    locationLoading,
    jobs.length,
    locationRequired,
    feedLoading,
  ]);

  const dailyPulseCount = useDailyPulse(
    locationRequired ? 0 : (new_jobs_count ?? 0),
  );

  const handleSetScope = useCallback(
    (scope: FeedScope) => {
      if (scope === "national" && !canUseNational) return;
      setRequestedScope(scope);
    },
    [canUseNational],
  );

  const handleOpenPremium = useCallback(() => {
    navigation.navigate("Premium");
  }, [navigation]);

  const handleLoadMore = useCallback(() => {
    if (locationRequired || isInitialLoading || loadingMore || !hasMore) return;
    void loadMore();
  }, [locationRequired, isInitialLoading, loadingMore, hasMore, loadMore]);

  const handleRefresh = useCallback(async () => {
    if (requestedScope === "local" && !canUseNearby) {
      await retryResolveLocation();
      return;
    }

    if (requestedScope === "local") {
      await silentRefreshLocation();
    }

    if (viewMode === "map") {
      await refreshMap();
      return;
    }

    await refresh();
  }, [
    requestedScope,
    canUseNearby,
    retryResolveLocation,
    silentRefreshLocation,
    viewMode,
    refreshMap,
    refresh,
  ]);

  const feedError = useMemo(() => {
    if (isInitialLoading) return null;

    if (requestedScope === "local" && locationRequired) {
      if (permissionDenied) {
        return "Turn on location permission to view nearby jobs.";
      }

      if (servicesDisabled) {
        return "Turn on device location services to view nearby jobs.";
      }

      if (locationStatus === "outside_uganda" || isWithinUganda === false) {
        return "Nearby jobs are only available when your device is detected inside Uganda.";
      }

      return locationError || "We could not match your current area yet.";
    }

    if (viewMode === "map") {
      return mapError;
    }

    return error;
  }, [
    isInitialLoading,
    requestedScope,
    locationRequired,
    permissionDenied,
    servicesDisabled,
    locationStatus,
    isWithinUganda,
    locationError,
    viewMode,
    mapError,
    error,
  ]);

  const locationLabel = useMemo(() => {
    if (effectiveScope === "national") {
      return resolvedDisplayLabel ?? displayLocationLabel ?? null;
    }
    return displayLocationLabel ?? resolvedDisplayLabel ?? null;
  }, [effectiveScope, resolvedDisplayLabel, displayLocationLabel]);

  const effectiveResolvedLevel = feedResolutionLevel ?? resolutionLevel;

  const isPreciseLocation =
    effectiveScope === "local" && effectiveResolvedLevel === "exact_local";

  const isAreaLocation =
    effectiveScope === "local" &&
    (effectiveResolvedLevel === "area_local" || isAreaLocal);

  const hasValidLocation =
    effectiveScope === "local"
      ? canUseNearby && locationStatus !== "stale_fallback"
      : true;

  const hasLocationContext =
    effectiveScope === "local"
      ? Boolean(locationLabel) || canUseNearby
      : Boolean(locationLabel);

  const effectiveCoverageNote = useMemo(() => {
    if (effectiveScope !== "local") return null;
    if (coverageNote) return coverageNote;

    if (
      (feedResolutionLevel === "district_only" || isDistrictFallback) &&
      locationLabel
    ) {
      return `Showing jobs across ${locationLabel}.`;
    }

    if (feedResolutionLevel === "area_local" && locationLabel) {
      return `Showing jobs around ${locationLabel}.`;
    }

    return null;
  }, [
    effectiveScope,
    coverageNote,
    feedResolutionLevel,
    isDistrictFallback,
    locationLabel,
  ]);

  const feedLocationDisplay = useMemo(
    () =>
      buildFeedLocationDisplay({
        effectiveScope,
        locationStatus,
        resolutionLevel: effectiveResolvedLevel,
        locationLabel,
        coverageNote: effectiveCoverageNote,
        isPreciseLocation,
        isAreaLocation,
        hasValidLocation,
      }),
    [
      effectiveScope,
      locationStatus,
      effectiveResolvedLevel,
      locationLabel,
      effectiveCoverageNote,
      isPreciseLocation,
      isAreaLocation,
      hasValidLocation,
    ],
  );

  if (viewMode === "map") {
    return (
      <FeedMapView
        navigation={navigation}
        items={mapItems}
        loading={isInitialLoading}
        error={feedError}
        refreshing={refreshing}
        refresh={handleRefresh}
        requestedScope={requestedScope}
        effectiveScope={effectiveScope}
        setRequestedScope={handleSetScope}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isGuest={isGuest}
        isPremium={isPremium}
        isNationalLocked={isNationalLocked}
        onOpenPremium={handleOpenPremium}
        locationRequired={locationRequired}
        onRetryLocation={retryResolveLocation}
        locationLabel={locationLabel}
        region={region}
        onRegionChangeComplete={setRegion}
      />
    );
  }

  return (
    <FeedView
      navigation={navigation}
      items={jobs}
      loading={isInitialLoading}
      loadingMore={locationRequired ? false : loadingMore}
      hasMore={locationRequired ? false : hasMore}
      onLoadMore={handleLoadMore}
      refresh={handleRefresh}
      premium={premium}
      requestedScope={requestedScope}
      effectiveScope={effectiveScope}
      setRequestedScope={handleSetScope}
      dailyPulseCount={locationRequired ? 0 : dailyPulseCount}
      isGuest={isGuest}
      isPremium={isPremium}
      hasValidLocation={hasValidLocation}
      hasLocationContext={hasLocationContext}
      isPreciseLocation={isPreciseLocation}
      isAreaLocation={isAreaLocation}
      locationLabel={locationLabel}
      isNationalLocked={isNationalLocked}
      onOpenPremium={handleOpenPremium}
      error={feedError}
      refreshing={refreshing}
      locationRequired={locationRequired}
      onRetryLocation={retryResolveLocation}
      coverageNote={effectiveCoverageNote}
      locationStatus={locationStatus}
      resolutionLevel={effectiveResolvedLevel}
      feedLocationDisplay={feedLocationDisplay}
      viewMode={viewMode}
      setViewMode={setViewMode}
    />
  );
}
