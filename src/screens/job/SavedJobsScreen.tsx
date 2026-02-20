import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../../core/supabase";
import { JobWithCoords } from "../../jobs/jobs.types";
import { JobCard } from "../../ui/components/job-card/JobCard";

const SAVED_KEY = "saved_job_ids";
const MAX_SAVED_FETCH = 50;

type Props = {
  navigation: any;
};

export default function SavedJobsScreen({ navigation }: Props) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [jobs, setJobs] = useState<JobWithCoords[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSavedJobs = useCallback(async () => {
    setLoading(true);

    try {
      const raw = await AsyncStorage.getItem(SAVED_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];

      const limitedIds = ids.slice(0, MAX_SAVED_FETCH);
      setSavedIds(limitedIds);

      if (limitedIds.length === 0) {
        setJobs([]);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get_saved_jobs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            job_ids: limitedIds,
          }),
        },
      );

      if (!res.ok) {
        setJobs([]);
        return;
      }

      const json = await res.json();
      setJobs(json.jobs ?? []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavedJobs();
    const unsubscribe = navigation.addListener("focus", loadSavedJobs);
    return unsubscribe;
  }, [navigation, loadSavedJobs]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading saved jobs…</Text>
      </View>
    );
  }

  if (savedIds.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No saved jobs</Text>
        <Text style={styles.subtitle}>
          Tap the ☆ icon on a job to save it here.
        </Text>
      </View>
    );
  }

  if (jobs.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Saved jobs unavailable</Text>
        <Text style={styles.subtitle}>
          Jobs may have expired or are outside your location access.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        initialNumToRender={6}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
        }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("JobDetail", {
                job: item,
              })
            }
          >
            <JobCard job={item} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = {
  center: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 32,
    backgroundColor: "#F8F9FB",
  },
  title: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center" as const,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center" as const,
  },
  loadingText: {
    textAlign: "center" as const,
    marginTop: 8,
    color: "#64748B",
  },
};
