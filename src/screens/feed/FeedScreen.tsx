import React, { useCallback, useMemo } from "react";
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

  const { locationId, loading: locationLoading } = useResolvedLocation();
  const hasValidLocation = Boolean(locationId);

  const [requestedScope, setRequestedScope] =
    React.useState<FeedScope>("local");

  const provisionalScope: FeedScope = isGuest ? "local" : requestedScope;

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
  } = useEdgeFeed(hasValidLocation ? locationId : null, provisionalScope);

  const isPremium = Boolean(premium);
  const effectiveScope: FeedScope =
    isGuest || (requestedScope === "national" && !isPremium)
      ? "local"
      : requestedScope;

  const isNationalLocked = !isGuest && !isPremium;
  const items = jobs ?? [];
  const dailyPulseCount = useDailyPulse(new_jobs_count ?? 0);

  const isInitialLoading = locationLoading || feedLoading;
  const hasEntered = !isInitialLoading;

  const canUseNational = !isGuest && isPremium;
  const canRefresh = effectiveScope === "national" || hasValidLocation;
  const canPaginate = effectiveScope === "national" || hasValidLocation;

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

  const handleOpenLocation = useCallback(() => {
    navigation.navigate("ManualLocation");
  }, [navigation]);

  const handleLoadMore = useCallback(() => {
    if (!canPaginate || isInitialLoading || loadingMore || !hasMore) {
      return;
    }

    void loadMore();
  }, [canPaginate, hasMore, isInitialLoading, loadMore, loadingMore]);

  const handleRefresh = useCallback(() => {
    if (!canRefresh || locationLoading || refreshing) {
      return;
    }

    void refresh();
  }, [canRefresh, locationLoading, refresh, refreshing]);

  return (
    <FeedView
      navigation={navigation}
      items={items}
      loading={isInitialLoading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
      refresh={handleRefresh}
      premium={premium}
      requestedScope={requestedScope}
      effectiveScope={effectiveScope}
      setRequestedScope={handleSetScope}
      dailyPulseCount={dailyPulseCount}
      isGuest={isGuest}
      isPremium={isPremium}
      hasValidLocation={hasValidLocation}
      isNationalLocked={isNationalLocked}
      onOpenPremium={handleOpenPremium}
      onOpenLocation={handleOpenLocation}
      hasEntered={hasEntered}
      error={error}
      refreshing={refreshing}
    />
  );
}
