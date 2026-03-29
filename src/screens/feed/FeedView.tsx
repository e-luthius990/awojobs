import React, { useCallback, useMemo, memo } from "react";
import {
  FlatList,
  RefreshControl,
  View,
  ActivityIndicator,
  type ViewStyle,
} from "react-native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import FeedList from "@ui/components/feed/FeedList";
import PremiumUpgradeCard from "@ui/components/feed/PremiumUpgradeCard";
import type { FeedJob } from "../../jobs/jobs.types";
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
import { StatusBadge } from "../../ui/StatusBadge";

type FeedNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<FeedStackParamList, "Feed">,
  NativeStackNavigationProp<RootStackParamList>
>;

type SkeletonItem = {
  id: string;
  __skeleton: true;
};

type ListItem = FeedJob | SkeletonItem;

type PremiumState = {
  active: boolean;
  scope: "local" | "national";
  requested_scope: "local" | "national";
  can_access_national: boolean;
};

type Props = {
  items: FeedJob[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  premium: PremiumState | null;
  requestedScope: "local" | "national";
  effectiveScope: "local" | "national";
  setRequestedScope?: (s: "local" | "national") => void;
  dailyPulseCount?: number;
  navigation: FeedNavigationProp;
  refresh?: () => void;
  refreshing?: boolean;
  error?: string | null;
  isGuest: boolean;
  isPremium: boolean;
  hasValidLocation: boolean;
  isNationalLocked: boolean;
  onOpenPremium: () => void;
  hasEntered?: boolean;
  locationRequired?: boolean;
  onRetryLocation?: () => void;
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
  dailyPulseCount = 0,
  navigation,
  refresh,
  refreshing = false,
  error = null,
  isGuest,
  isPremium,
  hasValidLocation,
  isNationalLocked,
  onOpenPremium,
  locationRequired = false,
  onRetryLocation,
}: Props) {
  const { theme } = useTheme();

  const isEmpty = !loading && items.length === 0;
  const showInitialSkeleton = loading && items.length === 0;
  const shouldShowGuestHero = isGuest;
  const shouldShowPremiumUpsell = !isGuest && isNationalLocked;

  const skeletonData = useMemo(
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
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xxxl + theme.layout.bottomBarHeight,
      paddingHorizontal: theme.spacing.screenX,
      flexGrow: 1,
    }),
    [
      theme.layout.bottomBarHeight,
      theme.spacing.screenX,
      theme.spacing.sm,
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
      return (
        <EmptyState
          title="Turn on location to view jobs"
          message="AwoJobs uses your device location to show nearby jobs. Enable location services and try again."
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

    if (error) {
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

    return (
      <EmptyState
        title="No jobs found"
        message="We could not find jobs near you right now. Try refreshing or check again later."
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
    isEmpty,
    locationRequired,
    onRetryLocation,
    refresh,
  ]);

  const scopeHelpText = useMemo(() => {
    if (isGuest) {
      return "Sign in to browse jobs across Uganda.";
    }

    if (isNationalLocked) {
      return "Upgrade to premium to browse jobs across Uganda.";
    }

    if (effectiveScope === "national") {
      return "Showing jobs across Uganda.";
    }

    if (!hasValidLocation) {
      return "Turn on location to see jobs near you.";
    }

    return "Showing jobs near your current location.";
  }, [effectiveScope, hasValidLocation, isGuest, isNationalLocked]);

  const listHeader = useMemo(() => {
    return (
      <View style={{ paddingBottom: theme.spacing.lg }}>
        <View style={{ marginBottom: theme.spacing.lg }}>
          {shouldShowGuestHero ? (
            <View style={{ marginBottom: theme.spacing.md }}>
              <PremiumUpgradeCard onPress={onOpenPremium} />
            </View>
          ) : null}

          {shouldShowPremiumUpsell ? (
            <AppCard variant="premium" padding="lg">
              <AppText variant="title" weight="700">
                Unlock national jobs
              </AppText>
              <AppText
                variant="bodySm"
                tone="secondary"
                style={{ marginTop: theme.spacing.xs }}
              >
                Upgrade to premium to browse jobs across Uganda.
              </AppText>
              <View style={{ marginTop: theme.spacing.md }}>
                <AppButton
                  title="See Premium"
                  onPress={onOpenPremium}
                  variant="primary"
                />
              </View>
            </AppCard>
          ) : null}
        </View>

        {error && items.length > 0 && !locationRequired ? (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <AppCard variant="muted" padding="md">
              <AppText variant="bodySm" tone="error">
                {error}
              </AppText>
            </AppCard>
          </View>
        ) : null}

        {setRequestedScope ? (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <AppText
              variant="labelLg"
              tone="secondary"
              weight="700"
              style={{ marginBottom: theme.spacing.sm }}
            >
              Browse Scope
            </AppText>

            <SegmentedControl
              value={requestedScope}
              onChange={setRequestedScope}
              options={[
                { label: "My District", value: "local" },
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

        {dailyPulseCount > 0 && !showInitialSkeleton && !locationRequired ? (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <DailyPulseCard count={dailyPulseCount} />
          </View>
        ) : null}
      </View>
    );
  }, [
    dailyPulseCount,
    error,
    isGuest,
    isNationalLocked,
    items.length,
    locationRequired,
    onOpenPremium,
    requestedScope,
    scopeHelpText,
    setRequestedScope,
    shouldShowGuestHero,
    shouldShowPremiumUpsell,
    showInitialSkeleton,
    theme.spacing.lg,
    theme.spacing.md,
    theme.spacing.sm,
    theme.spacing.xs,
  ]);

  const listEmptyComponent = useMemo(() => {
    if (showInitialSkeleton) return null;
    return emptyBlock;
  }, [emptyBlock, showInitialSkeleton]);

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
        refreshControl={
          refresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.colors.primary}
            />
          ) : undefined
        }
      />
    </AppScreen>
  );
}

export default memo(FeedViewComponent);
