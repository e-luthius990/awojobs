import React, { useCallback, useEffect, useMemo, memo, useRef } from "react";
import {
  FlatList,
  RefreshControl,
  View,
  ActivityIndicator,
  Pressable,
  type ViewStyle,
} from "react-native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import FeedList from "@ui/components/feed/FeedList";
import PremiumUpgradeCard from "@ui/components/feed/PremiumUpgradeCard";
import type { JobWithCoords } from "../../jobs/jobs.types";
import type { FeedStackParamList } from "../../navigation/FeedNavigator";
import type { RootStackParamList } from "../../navigation/RootNavigator";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { EmptyState } from "../../ui/EmptyState";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { SkeletonCard } from "../../ui/Skeleton";
import { StatusBadge, type StatusBadgeTone } from "../../ui/StatusBadge";

type FeedNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<FeedStackParamList, "Feed">,
  NativeStackNavigationProp<RootStackParamList>
>;

type SkeletonItem = {
  id: string;
  __skeleton: true;
};

type ListItem = JobWithCoords | SkeletonItem;

type PremiumState = {
  active: boolean;
  expired: boolean;
  scope: "local" | "national";
  requested_scope: "local" | "national";
  can_access_national: boolean;
  expires_at: string | null;
  days_remaining: number;
};

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

type ResolutionLevel =
  | "exact_local"
  | "area_local"
  | "district_only"
  | "uganda_only"
  | "outside_uganda"
  | null;

type FeedLocationDisplay = {
  badgeLabel: string | null;
  badgeTone: StatusBadgeTone | "default";
  title: string | null;
  subtitle: string | null;
};

type Props = {
  items: JobWithCoords[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  premium: PremiumState | null;
  requestedScope: "local" | "national";
  effectiveScope: "local" | "national";
  setRequestedScope?: (s: "local" | "national") => void;
  viewMode?: "list" | "map";
  setViewMode?: (mode: "list" | "map") => void;
  dailyPulseCount?: number;
  navigation: FeedNavigationProp;
  refresh?: () => void;
  refreshing?: boolean;
  error?: string | null;
  isGuest: boolean;
  isPremium: boolean;
  hasValidLocation: boolean;
  hasLocationContext?: boolean;
  isPreciseLocation?: boolean;
  isAreaLocation?: boolean;
  locationLabel?: string | null;
  isNationalLocked: boolean;
  onOpenPremium: () => void;
  locationRequired?: boolean;
  onRetryLocation?: () => void;
  coverageNote?: string | null;
  locationStatus?: LocationStatus;
  resolutionLevel?: ResolutionLevel;
  feedLocationDisplay: FeedLocationDisplay;
};

function DailyPulseCard({ count }: { count: number }) {
  return (
    <AppCard variant="muted" padding="lg">
      <View>
        <View style={{ marginBottom: 8 }}>
          <StatusBadge label="Daily Pulse" tone="info" />
        </View>

        <AppText variant="body">
          {count} new job{count > 1 ? "s" : ""} near you today.
        </AppText>
      </View>
    </AppCard>
  );
}

function CompactViewModeToggle({
  value,
  onChange,
}: {
  value: "list" | "map";
  onChange: (value: "list" | "map") => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignSelf: "flex-start",
        backgroundColor: "#F1F5F9",
        borderRadius: 999,
        padding: 3,
        gap: 4,
      }}
    >
      {(
        [
          { key: "list", label: "List" },
          { key: "map", label: "Map" },
        ] as const
      ).map((item) => {
        const active = value === item.key;

        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={{
              minWidth: 58,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? "#FFFFFF" : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: active ? "#CBD5E1" : "transparent",
            }}
          >
            <AppText
              variant="captionSm"
              weight="700"
              style={{ color: active ? "#0F172A" : "#64748B" }}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function FeedViewComponent({
  items,
  loading,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  premium,
  requestedScope,
  effectiveScope,
  setRequestedScope,
  viewMode = "list",
  setViewMode,
  dailyPulseCount = 0,
  navigation,
  refresh,
  refreshing = false,
  error = null,
  isGuest,
  isPremium,
  hasValidLocation,
  hasLocationContext = false,
  isPreciseLocation = false,
  isAreaLocation = false,
  locationLabel = null,
  isNationalLocked,
  onOpenPremium,
  locationRequired = false,
  onRetryLocation,
  coverageNote = null,
  locationStatus = "idle",
  resolutionLevel = null,
  feedLocationDisplay,
}: Props) {
  const { theme } = useTheme();

  const hasRenderedRealContentRef = useRef(false);

  useEffect(() => {
    if (items.length > 0) {
      hasRenderedRealContentRef.current = true;
    }
  }, [items.length]);

  const isEmpty = !loading && !refreshing && items.length === 0;

  const showInitialSkeleton =
    loading &&
    items.length === 0 &&
    !hasRenderedRealContentRef.current &&
    !refreshing;

  const shouldShowGuestHero = isGuest;
  const shouldShowPremiumUpgrade =
    !isGuest && !premium?.active && premium?.expired !== true;
  const shouldShowPremiumExpired = !isGuest && premium?.expired === true;

  const skeletonData = useMemo<SkeletonItem[]>(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        id: `feed-skeleton-${index}`,
        __skeleton: true as const,
      })),
    [],
  );

  const data: ListItem[] = showInitialSkeleton ? skeletonData : items;

  const listContentStyle = useMemo<ViewStyle>(
    () => ({
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.xxxl + theme.layout.bottomBarHeight,
      paddingHorizontal: theme.spacing.screenX,
      flexGrow: 1,
    }),
    [
      theme.layout.bottomBarHeight,
      theme.spacing.screenX,
      theme.spacing.xs,
      theme.spacing.xxxl,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if ("__skeleton" in item) {
        return <SkeletonCard />;
      }

      return (
        <FeedList item={item} navigation={navigation} isPremium={isPremium} />
      );
    },
    [navigation, isPremium],
  );

  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  const handleEndReached = useCallback(() => {
    if (locationRequired) return;
    if (!loading && !loadingMore && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [locationRequired, loading, loadingMore, hasMore, onLoadMore]);

  const listFooter = useMemo(() => {
    if (locationRequired || !loadingMore) {
      return <View style={{ height: theme.spacing.md }} />;
    }

    return (
      <View
        style={{
          paddingVertical: theme.spacing.xl,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={theme.colors.primary} />
        <AppText
          variant="caption"
          tone="secondary"
          weight="600"
          style={{ marginTop: theme.spacing.xs }}
        >
          Loading more jobs…
        </AppText>
      </View>
    );
  }, [
    locationRequired,
    loadingMore,
    theme.colors.primary,
    theme.spacing.md,
    theme.spacing.xl,
    theme.spacing.xs,
  ]);

  const emptyBlock = useMemo(() => {
    if (!isEmpty) return null;

    if (locationRequired) {
      let title = "Nearby jobs are not ready yet";
      let message = "We could not confirm a usable nearby area yet.";

      if (locationStatus === "permission_denied") {
        title = "Turn on location permission";
        message =
          "AwoJobs needs location permission to show jobs near your current area.";
      } else if (locationStatus === "services_disabled") {
        title = "Turn on device location services";
        message =
          "Your phone’s location services are off, so we cannot detect nearby jobs yet.";
      } else if (locationStatus === "outside_uganda") {
        title = "Nearby jobs are only available inside Uganda";
        message =
          "Your current device location appears to be outside Uganda, so nearby jobs are not available right now.";
      } else if (locationStatus === "resolving") {
        title = "Finding your nearby area";
        message =
          "We are still checking your current device location for nearby jobs.";
      } else if (locationStatus === "stale_fallback" && locationLabel) {
        title = "We are refreshing your area";
        message = `We detected ${locationLabel}, but your nearby feed is still updating.`;
      } else if (locationStatus === "uganda_only") {
        title = "We found Uganda, but not your nearby district yet";
        message =
          "Your device appears to be in Uganda, but we could not resolve a nearby district yet. Try refreshing in a moment.";
      } else if (hasLocationContext && locationLabel) {
        title = "Nearby jobs are not ready yet";
        message = `We detected your area around ${locationLabel}, but nearby jobs are not ready yet. Try again.`;
      }

      return (
        <EmptyState
          title={title}
          message={message}
          action={
            onRetryLocation ? (
              <AppButton
                title="Retry"
                onPress={onRetryLocation}
                variant="primary"
              />
            ) : undefined
          }
        />
      );
    }

    if (error && !loading && !refreshing) {
      return (
        <EmptyState
          title="Could not load jobs"
          message={error}
          action={
            refresh ? (
              <AppButton
                title="Try Again"
                onPress={refresh}
                variant="primary"
              />
            ) : undefined
          }
        />
      );
    }

    if (effectiveScope === "national") {
      return (
        <EmptyState
          title="No jobs found nationwide"
          message="There are no jobs to show across Uganda right now. Check back again later."
        />
      );
    }

    if (resolutionLevel === "district_only" && locationLabel) {
      return (
        <EmptyState
          title="No jobs found in this district"
          message={`We could not find jobs across ${locationLabel} right now. Try refreshing or check again later.`}
          action={
            refresh ? (
              <AppButton
                title="Refresh"
                onPress={refresh}
                variant="secondary"
              />
            ) : undefined
          }
        />
      );
    }

    if (resolutionLevel === "area_local" && locationLabel) {
      return (
        <EmptyState
          title="No jobs found in this area"
          message={`We could not find jobs around ${locationLabel} right now. Try refreshing or check again later.`}
          action={
            refresh ? (
              <AppButton
                title="Refresh"
                onPress={refresh}
                variant="secondary"
              />
            ) : undefined
          }
        />
      );
    }

    return (
      <EmptyState
        title="No jobs found nearby"
        message={
          hasValidLocation
            ? locationLabel
              ? `We could not find nearby jobs around ${locationLabel} right now. Try refreshing or check again later.`
              : "We could not find nearby jobs right now. Try refreshing or check again later."
            : "We could not confirm a usable nearby area right now. Try again in a moment."
        }
        action={
          refresh ? (
            <AppButton title="Refresh" onPress={refresh} variant="secondary" />
          ) : undefined
        }
      />
    );
  }, [
    effectiveScope,
    error,
    hasLocationContext,
    hasValidLocation,
    isEmpty,
    locationLabel,
    locationRequired,
    locationStatus,
    onRetryLocation,
    refresh,
    refreshing,
    resolutionLevel,
    loading,
  ]);

  const scopeHelpText = useMemo(() => {
    if (isGuest) {
      return "Guests can browse nearby jobs. Sign in for more.";
    }

    if (isNationalLocked) {
      return "Upgrade to premium to browse jobs across Uganda.";
    }

    if (effectiveScope === "national") {
      return "Showing jobs across Uganda.";
    }

    if (!hasValidLocation) {
      if (locationStatus === "services_disabled") {
        return "Turn on device location services to see nearby jobs.";
      }

      if (locationStatus === "permission_denied") {
        return "Allow location access to see nearby jobs.";
      }

      if (locationStatus === "outside_uganda") {
        return "Nearby jobs are only available inside Uganda.";
      }

      if (locationStatus === "stale_fallback" && locationLabel) {
        return `Refreshing your area around ${locationLabel}.`;
      }

      if (locationStatus === "uganda_only") {
        return "We found Uganda, but not your nearby district yet.";
      }

      if (hasLocationContext && locationLabel) {
        return `Detected around ${locationLabel}, but nearby jobs are not ready yet.`;
      }

      return "We could not confirm a usable nearby area yet.";
    }

    if (coverageNote) {
      return coverageNote;
    }

    if (isPreciseLocation && locationLabel) {
      return `Showing nearby jobs around ${locationLabel}.`;
    }

    if (isAreaLocation && locationLabel) {
      return `Showing jobs around ${locationLabel}.`;
    }

    if (resolutionLevel === "district_only" && locationLabel) {
      return `Showing jobs across ${locationLabel}.`;
    }

    return "Showing nearby jobs from your current detected area.";
  }, [
    coverageNote,
    effectiveScope,
    hasLocationContext,
    hasValidLocation,
    isAreaLocation,
    isGuest,
    isNationalLocked,
    isPreciseLocation,
    locationLabel,
    locationStatus,
    resolutionLevel,
  ]);

  const showLocationCard = Boolean(
    feedLocationDisplay.badgeLabel ||
    feedLocationDisplay.title ||
    feedLocationDisplay.subtitle ||
    (requestedScope === "local" && !hasValidLocation),
  );

  const useCompactLocationRow = useMemo(() => {
    if (!showLocationCard) return false;

    return (
      feedLocationDisplay.badgeLabel !== "Permission needed" &&
      feedLocationDisplay.badgeLabel !== "Services off" &&
      feedLocationDisplay.badgeLabel !== "Outside Uganda" &&
      feedLocationDisplay.badgeLabel !== "Locating district" &&
      feedLocationDisplay.badgeLabel !== "Refreshing area"
    );
  }, [showLocationCard, feedLocationDisplay.badgeLabel]);

  const listHeader = useMemo(() => {
    return (
      <View style={{ paddingBottom: theme.spacing.sm }}>
        {setRequestedScope ? (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <AppText
              variant="labelLg"
              tone="secondary"
              weight="700"
              style={{ marginBottom: theme.spacing.xs }}
            >
              Browse Scope
            </AppText>

            <SegmentedControl
              value={requestedScope}
              onChange={setRequestedScope}
              options={[
                { label: "Nearby", value: "local" },
                {
                  label: "National",
                  value: "national",
                  disabled: isGuest || isNationalLocked,
                },
              ]}
            />

            <AppText
              variant="caption"
              tone="tertiary"
              style={{ marginTop: theme.spacing.xs }}
            >
              {scopeHelpText}
            </AppText>
          </View>
        ) : null}

        {showLocationCard ? (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <AppCard
              variant="muted"
              padding="sm"
              style={
                useCompactLocationRow
                  ? {
                      backgroundColor: isPreciseLocation
                        ? theme.colors.successSoft
                        : isAreaLocation
                          ? (theme.colors.infoSoft ?? theme.colors.surfaceMuted)
                          : theme.colors.successSoft,
                      borderColor: isPreciseLocation
                        ? theme.colors.verifiedBorder
                        : isAreaLocation
                          ? theme.colors.info
                          : theme.colors.verifiedBorder,
                    }
                  : undefined
              }
            >
              {useCompactLocationRow ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    minWidth: 0,
                    gap: theme.spacing.xs,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      alignItems: "center",
                      paddingTop: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: isPreciseLocation
                          ? theme.colors.success
                          : isAreaLocation
                            ? theme.colors.info
                            : theme.colors.success,
                      }}
                    />
                  </View>

                  <View
                    style={{
                      flex: 1,
                      minWidth: 0,
                      gap: 2,
                    }}
                  >
                    {feedLocationDisplay.title ? (
                      <AppText variant="caption" weight="700" numberOfLines={1}>
                        {feedLocationDisplay.title}
                      </AppText>
                    ) : null}

                    {feedLocationDisplay.subtitle ? (
                      <AppText
                        variant="captionSm"
                        tone="secondary"
                        numberOfLines={2}
                      >
                        {feedLocationDisplay.subtitle}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              ) : (
                <>
                  {feedLocationDisplay.badgeLabel ? (
                    <View style={{ marginBottom: theme.spacing.xs }}>
                      <StatusBadge
                        label={feedLocationDisplay.badgeLabel}
                        tone={feedLocationDisplay.badgeTone}
                      />
                    </View>
                  ) : null}

                  {feedLocationDisplay.title ? (
                    <AppText variant="titleLg" weight="700" numberOfLines={1}>
                      {feedLocationDisplay.title}
                    </AppText>
                  ) : null}

                  {feedLocationDisplay.subtitle ? (
                    <AppText
                      variant="bodySm"
                      tone="secondary"
                      style={{
                        marginTop: feedLocationDisplay.title
                          ? theme.spacing.xs
                          : 0,
                      }}
                    >
                      {feedLocationDisplay.subtitle}
                    </AppText>
                  ) : null}
                </>
              )}
            </AppCard>
          </View>
        ) : null}

        {shouldShowGuestHero ? (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <PremiumUpgradeCard mode="upgrade" onPress={onOpenPremium} />
          </View>
        ) : null}

        {shouldShowPremiumUpgrade ? (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <PremiumUpgradeCard mode="upgrade" onPress={onOpenPremium} />
          </View>
        ) : null}

        {shouldShowPremiumExpired ? (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <PremiumUpgradeCard mode="expired" onPress={onOpenPremium} />
          </View>
        ) : null}

        {setViewMode ? (
          <View
            style={{
              marginBottom: theme.spacing.sm,
              alignItems: "flex-start",
            }}
          >
            <CompactViewModeToggle value={viewMode} onChange={setViewMode} />
          </View>
        ) : null}

        {error && items.length > 0 && !locationRequired ? (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <AppCard variant="muted" padding="md">
              <AppText variant="bodySm" tone="error">
                {error}
              </AppText>
            </AppCard>
          </View>
        ) : null}

        {dailyPulseCount > 0 && !showInitialSkeleton && !locationRequired ? (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <DailyPulseCard count={dailyPulseCount} />
          </View>
        ) : null}
      </View>
    );
  }, [
    dailyPulseCount,
    error,
    feedLocationDisplay.badgeLabel,
    feedLocationDisplay.badgeTone,
    feedLocationDisplay.subtitle,
    feedLocationDisplay.title,
    isAreaLocation,
    isGuest,
    isNationalLocked,
    isPreciseLocation,
    items.length,
    locationRequired,
    onOpenPremium,
    requestedScope,
    scopeHelpText,
    setRequestedScope,
    setViewMode,
    shouldShowGuestHero,
    shouldShowPremiumUpgrade,
    shouldShowPremiumExpired,
    showInitialSkeleton,
    showLocationCard,
    theme.colors.info,
    theme.colors.infoSoft,
    theme.colors.success,
    theme.colors.successSoft,
    theme.colors.surfaceMuted,
    theme.colors.verifiedBorder,
    theme.spacing.sm,
    theme.spacing.xs,
    useCompactLocationRow,
    viewMode,
  ]);

  const listEmptyComponent = useMemo(() => {
    if (showInitialSkeleton) return null;
    return emptyBlock;
  }, [emptyBlock, showInitialSkeleton]);

  const refreshControl = useMemo(() => {
    if (!refresh) return undefined;

    return (
      <RefreshControl
        refreshing={refreshing && !loading}
        onRefresh={refresh}
        tintColor={theme.colors.primary}
      />
    );
  }, [refresh, refreshing, loading, theme.colors.primary]);

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={listFooter}
        contentContainerStyle={listContentStyle}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={40}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.45}
        refreshControl={refreshControl}
      />
    </AppScreen>
  );
}

export default memo(FeedViewComponent);
