import React, { useMemo, useCallback, memo } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
} from "react-native";

import FeedList from "@ui/components/feed/FeedList";
import PremiumUpgradeCard from "@ui/components/feed/PremiumUpgradeCard";
import { JobCardSkeleton } from "@ui/components/JobCardSkeleton";
import { FeedJob } from "../../jobs/jobs.types";

type SkeletonItem = {
  id: string;
  __skeleton: true;
};

type ListItem = FeedJob | SkeletonItem;

type PremiumState = {
  active: boolean;
  expires_at: string | null;
  days_remaining: number;
  scope: "local" | "national";
  phone: string | null;
};

type Props = {
  items: FeedJob[];
  loading: boolean;
  premium: PremiumState | null;
  requestedScope: "local" | "national";
  setRequestedScope?: (s: "local" | "national") => void;
  dailyPulseCount?: number;
  navigation: any;
  refresh?: () => void;
  isGuest: boolean;
};

function FeedViewComponent({
  items,
  loading,
  premium,
  requestedScope,
  setRequestedScope,
  dailyPulseCount = 0,
  navigation,
  refresh,
  isGuest,
}: Props) {
  const isPremium = premium?.active === true;
  const isEmpty = !loading && items.length === 0;

  const showUpgradeCTA = isGuest;
  const showRenewCTA = !isGuest && !isPremium;

  /* ---------------- Skeleton ---------------- */

  const skeletonData = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        id: `skeleton-${i}`,
        __skeleton: true as const,
      })),
    [],
  );

  const showSkeleton = loading && items.length === 0;

  const data: ListItem[] = useMemo(
    () => (showSkeleton ? skeletonData : items),
    [showSkeleton, skeletonData, items],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if ("__skeleton" in item) return <JobCardSkeleton />;
      return (
        <FeedList item={item} navigation={navigation} isPremium={isPremium} />
      );
    },
    [navigation, isPremium],
  );

  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  /* ---------------- Header ---------------- */

  const ListHeader = useMemo(() => {
    return (
      <>
        {/* PREMIUM STRIP */}
        {isPremium && (
          <View style={styles.premiumStrip}>
            <Text style={styles.premiumStripText}>
              ⭐ Premium Access · Nationwide Jobs
            </Text>
          </View>
        )}

        {/* PREMIUM INFO CARD */}
        {isPremium && (
          <View style={styles.premiumBanner}>
            <Text style={styles.premiumTitle}>Premium Active</Text>

            {premium?.phone && (
              <Text style={styles.premiumPhone}>{premium.phone}</Text>
            )}

            <Text style={styles.premiumExpiry}>
              {premium?.days_remaining} day
              {premium?.days_remaining !== 1 ? "s" : ""} remaining
            </Text>
          </View>
        )}

        {/* Guest CTA */}
        {showUpgradeCTA && (
          <PremiumUpgradeCard
            onPress={() => navigation.getParent()?.navigate("Premium")}
          />
        )}

        {/* Expired CTA */}
        {showRenewCTA && (
          <PremiumUpgradeCard
            onPress={() => navigation.getParent()?.navigate("Premium")}
          />
        )}

        {/* Scope Toggle */}
        {isPremium && setRequestedScope && (
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setRequestedScope("local")}
              style={[
                styles.toggleBtn,
                requestedScope === "local" && styles.toggleActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  requestedScope === "local" && styles.toggleTextActive,
                ]}
              >
                My District
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setRequestedScope("national")}
              style={[
                styles.toggleBtn,
                requestedScope === "national" && styles.toggleActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  requestedScope === "national" && styles.toggleTextActive,
                ]}
              >
                National
              </Text>
            </Pressable>
          </View>
        )}

        {/* Pulse */}
        {dailyPulseCount > 0 && (
          <View style={styles.pulseBox}>
            <Text style={styles.pulseText}>
              🔔 {dailyPulseCount} new job
              {dailyPulseCount > 1 ? "s" : ""} near you today
            </Text>
          </View>
        )}

        {/* Empty */}
        {isEmpty && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No jobs found</Text>
            <Text style={styles.emptySubtitle}>
              {isGuest
                ? "Upgrade to unlock jobs across Uganda."
                : isPremium
                  ? "Check back later."
                  : "Premium expired. Renew to unlock nationwide jobs."}
            </Text>
          </View>
        )}
      </>
    );
  }, [
    isPremium,
    premium,
    showUpgradeCTA,
    showRenewCTA,
    requestedScope,
    setRequestedScope,
    dailyPulseCount,
    isEmpty,
    navigation,
    isGuest,
  ]);

  return (
    <View style={[styles.container, isPremium && styles.premiumBackground]}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={40}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          refresh ? (
            <RefreshControl
              refreshing={loading && items.length > 0}
              onRefresh={refresh}
            />
          ) : undefined
        }
      />
    </View>
  );
}

export default memo(FeedViewComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F8FC",
  },

  premiumBackground: {
    backgroundColor: "#FDFCF8", // subtle warm tone
  },

  premiumStrip: {
    backgroundColor: "#111827",
    paddingVertical: 8,
    alignItems: "center",
  },
  premiumStripText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },

  premiumBanner: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FACC15",
  },
  premiumTitle: {
    fontWeight: "800",
    fontSize: 15,
    color: "#92400E",
  },
  premiumPhone: {
    marginTop: 4,
    fontWeight: "600",
  },
  premiumExpiry: {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.8,
  },

  toggleRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  toggleActive: {
    backgroundColor: "#1E293B",
  },
  toggleText: {
    fontWeight: "700",
    color: "#334155",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },

  pulseBox: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  pulseText: {
    fontWeight: "800",
    color: "#1E3A8A",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
});
