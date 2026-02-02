import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  Platform,
  ToastAndroid,
} from "react-native";
import * as Haptics from "expo-haptics";

import { resolveLocation } from "../../location/location.service";
import { useJobFeed } from "../../state/useJobFeed";
import { PulseScanButton } from "../../ui/components/PulseScanButton";
import { JobCard } from "../../ui/components/JobCard";
import { NewJobsBanner } from "../../ui/components/NewJobsBanner";
import { FeedSkeleton } from "../../ui/components/FeedSkeleton";
import { EmptyState } from "../../ui/components/EmptyState";
import { Job } from "../../jobs/jobs.types";

type Coords = { lat: number; lng: number };

/* -------------------------------------------------------
   DISTANCE BAND
-------------------------------------------------------- */
function distanceBand(km: number) {
  if (km <= 2) return "Very close";
  if (km <= 5) return "Nearby";
  return "A bit farther";
}

/* -------------------------------------------------------
   ANDROID TOAST
-------------------------------------------------------- */
function showToast(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

/* -------------------------------------------------------
   SCREEN
-------------------------------------------------------- */
export default function FeedScreen({ navigation }: any) {
  const mountedRef = useRef(true);
  const listRef = useRef<FlatList>(null);

  const [locationId, setLocationId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);

  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /* =====================================================
     LOCATION RESOLUTION
  ====================================================== */
  const loadLocation = async () => {
    setLocLoading(true);
    setLocError(null);

    try {
      const loc = await resolveLocation();
      if (!mountedRef.current) return;

      if (loc?.location_id) {
        setLocationId(loc.location_id);
        if (loc.lat && loc.lng) {
          setUserCoords({ lat: loc.lat, lng: loc.lng });
        }
      } else {
        setLocError("Location unavailable.");
      }
    } catch {
      if (mountedRef.current) setLocError("Location unavailable.");
    } finally {
      if (mountedRef.current) setLocLoading(false);
    }
  };

  useEffect(() => {
    loadLocation();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* =====================================================
     JOB FEED
  ====================================================== */
  const {
    jobs,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    scanNew, // ⬅️ returns number
    pendingCount,
    applyNew,
  } = useJobFeed(locationId);

  /* =====================================================
     PULL TO REFRESH
  ====================================================== */
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const found = await scanNew();

      if (found > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        showToast(`${found} new job${found > 1 ? "s" : ""} found nearby`);

        applyNew();
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    } finally {
      setRefreshing(false);
    }
  };

  /* =====================================================
     FLOATING SCAN
  ====================================================== */
  const handleScan = async () => {
    const found = await scanNew();

    if (found > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast(`${found} new job${found > 1 ? "s" : ""} found nearby`);
    }
  };

  /* =====================================================
     APPLY NEW (BANNER)
  ====================================================== */
  const handleApplyNew = () => {
    applyNew();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  /* =====================================================
     GROUP JOBS BY DISTANCE
  ====================================================== */
  const groupedItems = useMemo(() => {
    if (!userCoords) {
      return jobs.map((job) => ({ type: "job", job }));
    }

    let lastBand: string | null = null;
    const items: any[] = [];

    for (const job of jobs) {
      if (!job.lat || !job.lng) {
        items.push({ type: "job", job });
        continue;
      }

      const km =
        Math.round(
          Math.sqrt(
            Math.pow(job.lat - userCoords.lat, 2) +
              Math.pow(job.lng - userCoords.lng, 2),
          ) *
            111 *
            10,
        ) / 10;

      const band = distanceBand(km);

      if (band !== lastBand) {
        items.push({ type: "header", label: band });
        lastBand = band;
      }

      items.push({ type: "job", job });
    }

    return items;
  }, [jobs, userCoords]);

  /* =====================================================
     RENDER ITEM
  ====================================================== */
  const renderItem = useCallback(
    ({ item }: any) => {
      if (item.type === "header") {
        return (
          <Text
            style={{
              marginTop: 22,
              marginBottom: 8,
              fontWeight: "700",
              fontSize: 13,
              color: "#475569",
            }}
          >
            {item.label}
          </Text>
        );
      }

      return (
        <Pressable
          onPress={() => navigation.navigate("JobDetail", { job: item.job })}
        >
          <JobCard job={item.job} userCoords={userCoords ?? undefined} />
        </Pressable>
      );
    },
    [navigation, userCoords],
  );

  /* =====================================================
     STATES
  ====================================================== */
  if (locLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ textAlign: "center", marginTop: 8, color: "#64748B" }}>
          Detecting your area…
        </Text>
      </View>
    );
  }

  if (locError) {
    return (
      <EmptyState
        title="Set your location"
        subtitle="Turn on GPS or choose your area manually."
        onRetry={loadLocation}
        onChangeLocation={() => navigation.navigate("ManualLocation")}
      />
    );
  }

  if (loading && jobs.length === 0) {
    return <FeedSkeleton />;
  }

  /* =====================================================
     FEED
  ====================================================== */
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <NewJobsBanner count={pendingCount} onPress={handleApplyNew} />

      <FlatList
        ref={listRef}
        data={groupedItems}
        keyExtractor={(item, index) =>
          item.type === "header" ? `header-${item.label}-${index}` : item.job.id
        }
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={() => hasMore && !loadingMore && loadMore()}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="Nothing nearby yet"
              subtitle="Jobs will appear here when posted around you."
            />
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : null
        }
      />

      <PulseScanButton floating onPress={handleScan} loading={loading} />
    </View>
  );
}
