// app/(tabs)/feed.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import {
  getCachedResolvedLocation,
  resolveLocationAndPersist,
} from "../../src/location/location.service";
import { fetchLocalJobs } from "../../src/jobs/jobs.service";
import { getCachedJobs, setCachedJobs } from "../../src/jobs/jobs.cache";
import { JobCard } from "../../src/ui/components/JobCard";
import { PulseScanButton } from "../../src/ui/components/PulseScanButton";
import type { Job } from "../../src/jobs/jobs.service";

export default function FeedScreen() {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<
    "booting" | "ready" | "no_location" | "error"
  >("booting");

  useEffect(() => {
    (async () => {
      // 1) cached location
      const cachedLoc = await getCachedResolvedLocation();
      if (cachedLoc?.location_id) {
        setLocationId(cachedLoc.location_id);
        const cachedJobs = await getCachedJobs(cachedLoc.location_id);
        setJobs(cachedJobs);
        setStatus("ready");
      }

      // 2) resolve fresh in background
      try {
        const resolved = await resolveLocationAndPersist();
        if (!resolved?.location_id) {
          if (!cachedLoc) setStatus("no_location");
          return;
        }
        setLocationId(resolved.location_id);

        // fetch jobs
        const fresh = await fetchLocalJobs(resolved.location_id);
        setJobs(fresh);
        await setCachedJobs(resolved.location_id, fresh);
        setStatus("ready");
      } catch {
        if (!cachedLoc) setStatus("error");
      }
    })();
  }, []);

  const onScan = async () => {
    if (!locationId) return;
    setRefreshing(true);
    try {
      const before = new Set(jobs.map((j) => j.id));
      const fresh = await fetchLocalJobs(locationId);
      const created = fresh.filter((j) => !before.has(j.id));
      setNewIds(new Set(created.map((j) => j.id)));
      setJobs(fresh);
      await setCachedJobs(locationId, fresh);
    } finally {
      setRefreshing(false);
      // clear highlights after a short time (lightweight, no heavy animations)
      setTimeout(() => setNewIds(new Set()), 6000);
    }
  };

  const headerText = useMemo(() => {
    if (status === "no_location")
      return "Turn on location to see jobs near you.";
    if (status === "error") return "Couldn’t load jobs. Try scanning again.";
    return "Jobs near you";
  }, [status]);

  return (
    <View style={{ flex: 1, paddingTop: 12 }}>
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>{headerText}</Text>
        <PulseScanButton onPress={onScan} loading={refreshing} />
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onScan} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={{ paddingTop: 30 }}>
            <Text style={{ opacity: 0.7 }}>
              No jobs posted here yet. Tap “Scan My Area” again later.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <JobCard job={item} highlight={newIds.has(item.id)} />
        )}
      />
    </View>
  );
}
