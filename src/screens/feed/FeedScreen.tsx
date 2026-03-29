import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CompositeNavigationProp,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import FeedView from "./FeedView";
import { useResolvedLocation } from "@hooks/useResolvedLocation";
import { useEdgeFeed } from "@hooks/useEdgeFeed";
import { useDailyPulse } from "@hooks/useDailyPulse";
import { useSession } from "@state/useSession";

import type { FeedStackParamList } from "../../navigation/FeedNavigator";
import type { RootStackParamList } from "../../navigation/RootNavigator";

type FeedNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<FeedStackParamList, "Feed">,
  NativeStackNavigationProp<RootStackParamList>
>;

type FeedScope = "local" | "national";

export default function FeedScreen() {
  const navigation = useNavigation<FeedNavigationProp>();

  const { session } = useSession();
  const isGuest = !session;

  const {
    locationId,
    loading: locationLoading,
    retry: retryResolveLocation,
    permissionDenied,
  } = useResolvedLocation();

  const hasValidLocation = Boolean(locationId);

  const [requestedScope, setRequestedScope] = useState<FeedScope>("local");

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
    refreshing,
  } = useEdgeFeed(hasValidLocation ? locationId : null, requestedScope);

  const isPremium = premium?.active === true;

  const effectiveScope: FeedScope = useMemo(() => {
    if (isGuest) return "local";
    if (requestedScope === "national" && !isPremium) {
      return "local";
    }
    return requestedScope;
  }, [isGuest, requestedScope, isPremium]);

  useEffect(() => {
    if (requestedScope === "national" && (isGuest || !isPremium)) {
      setRequestedScope("local");
    }
  }, [requestedScope, isGuest, isPremium]);

  const requiresLocation = effectiveScope === "local";
  const canUseNational = !isGuest && isPremium;
  const isNationalLocked = !isGuest && !isPremium;

  const canFetchFeed = !requiresLocation || hasValidLocation;
  const showLocationRequired =
    !locationLoading && requiresLocation && !hasValidLocation;

  const isInitialLoading = locationLoading || (canFetchFeed && feedLoading);

  const hasEntered = !locationLoading;
  const dailyPulseCount = useDailyPulse(
    showLocationRequired ? 0 : (new_jobs_count ?? 0),
  );

  const canRefresh = !requiresLocation || hasValidLocation;
  const canPaginate = !requiresLocation || hasValidLocation;

  const handleSetScope = useCallback(
    (scope: FeedScope) => {
      if (scope === "national" && !canUseNational) {
        return;
      }

      setRequestedScope(scope);
    },
    [canUseNational],
  );

  const handleOpenPremium = useCallback(() => {
    navigation.navigate("Premium");
  }, [navigation]);

  const handleLoadMore = useCallback(() => {
    if (!canPaginate || isInitialLoading || loadingMore || !hasMore) {
      return;
    }

    void loadMore();
  }, [canPaginate, hasMore, isInitialLoading, loadMore, loadingMore]);

  const handleRefresh = useCallback(() => {
    if (showLocationRequired) {
      void retryResolveLocation();
      return;
    }

    if (!canRefresh || locationLoading || refreshing) {
      return;
    }

    void refresh();
  }, [
    showLocationRequired,
    retryResolveLocation,
    canRefresh,
    locationLoading,
    refreshing,
    refresh,
  ]);

  return (
    <FeedView
      navigation={navigation}
      items={showLocationRequired ? [] : jobs}
      loading={isInitialLoading}
      loadingMore={showLocationRequired ? false : loadingMore}
      hasMore={showLocationRequired ? false : hasMore}
      onLoadMore={handleLoadMore}
      refresh={handleRefresh}
      premium={premium}
      requestedScope={requestedScope}
      effectiveScope={effectiveScope}
      setRequestedScope={handleSetScope}
      dailyPulseCount={showLocationRequired ? 0 : dailyPulseCount}
      isGuest={isGuest}
      isPremium={isPremium}
      hasValidLocation={hasValidLocation}
      isNationalLocked={isNationalLocked}
      onOpenPremium={handleOpenPremium}
      hasEntered={hasEntered}
      error={
        showLocationRequired
          ? permissionDenied
            ? "Turn on location to view jobs. Permission is off."
            : "Turn on location to view jobs."
          : error
      }
      refreshing={refreshing}
      locationRequired={showLocationRequired}
      onRetryLocation={retryResolveLocation}
    />
  );
}
