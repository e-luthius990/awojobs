import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
  type ViewStyle,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { supabase } from "../../core/supabase";
import { ENV } from "../../env";
import { JobWithCoords } from "../../jobs/jobs.types";
import JobCard from "../../ui/components/job-card/JobCard";

import type { SavedStackParamList } from "../../navigation/SavedNavigator";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { EmptyState } from "../../ui/EmptyState";
import { InlineAlert } from "../../ui/InlineAlert";
import { SkeletonCard } from "../../ui/Skeleton";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { StatusBadge } from "../../ui/StatusBadge";
import { AppButton } from "../../ui/AppButton";

type SavedNavigationProp = NativeStackNavigationProp<
  SavedStackParamList,
  "SavedJobs"
>;

const MAX_SAVED_FETCH = 50;

type UserRole = "job_seeker" | "employer" | "moderator" | "super_admin" | null;

export default function SavedJobsScreen() {
  const navigation = useNavigation<SavedNavigationProp>();
  const { theme } = useTheme();

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [jobs, setJobs] = useState<JobWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSavedJobs = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;

    if (!silent) {
      setLoading(true);
    }

    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user ?? null;
      const token = session?.access_token ?? null;

      if (!user || !token) {
        setIsSignedIn(false);
        setRole(null);
        setSavedIds([]);
        setJobs([]);
        return;
      }

      setIsSignedIn(true);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setRole(null);
        setSavedIds([]);
        setJobs([]);
        setError("Could not load your saved jobs right now.");
        return;
      }

      const currentRole = (profile.role as UserRole) ?? null;
      setRole(currentRole);

      if (currentRole !== "job_seeker") {
        setSavedIds([]);
        setJobs([]);
        return;
      }

      const { data: savedRows, error: savedError } = await supabase
        .from("saved_jobs")
        .select("job_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(MAX_SAVED_FETCH);

      if (savedError) {
        setSavedIds([]);
        setJobs([]);
        setError("Could not load your saved jobs right now.");
        return;
      }

      const ids = Array.isArray(savedRows)
        ? savedRows
            .map((row) => row.job_id)
            .filter((id): id is string => typeof id === "string")
        : [];

      setSavedIds(ids);

      if (ids.length === 0) {
        setJobs([]);
        return;
      }

      const res = await fetch(
        `${ENV.SUPABASE_URL}/functions/v1/get_saved_jobs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            job_ids: ids,
          }),
        },
      );

      if (!res.ok) {
        setJobs([]);
        setError("Could not load your saved jobs right now.");
        return;
      }

      const json = await res.json();
      const fetchedJobs: JobWithCoords[] = Array.isArray(json.jobs)
        ? json.jobs
        : [];

      const orderMap = new Map(ids.map((id, index) => [id, index]));
      fetchedJobs.sort(
        (a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999),
      );

      setJobs(fetchedJobs);
    } catch {
      setSavedIds([]);
      setJobs([]);
      setError("Could not load your saved jobs right now.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadSavedJobs();

    const unsubscribe = navigation.addListener("focus", () => {
      void loadSavedJobs({ silent: true });
    });

    return unsubscribe;
  }, [navigation, loadSavedJobs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSavedJobs({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadSavedJobs]);

  const listContentStyle = useMemo<ViewStyle>(
    () => ({
      paddingBottom: theme.spacing.xxxl,
      paddingHorizontal: theme.spacing.screenX,
      paddingTop: theme.spacing.md,
    }),
    [theme.spacing.md, theme.spacing.screenX, theme.spacing.xxxl],
  );

  const headerWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const heroWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const itemWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const loaderWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  if (loading) {
    return (
      <AppScreen scroll>
        <View style={loaderWrapStyle}>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </View>
      </AppScreen>
    );
  }

  if (!isSignedIn) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Sign in required"
          message="Only signed-in job seekers can save jobs and access them here."
        />
      </AppScreen>
    );
  }

  if (role !== "job_seeker") {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Saved jobs unavailable"
          message="Only job seekers can save and view saved jobs."
        />
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Could not load saved jobs"
          message={error}
          action={
            <AppButton
              title="Try Again"
              onPress={() => void loadSavedJobs()}
              variant="primary"
            />
          }
        />
      </AppScreen>
    );
  }

  if (savedIds.length === 0) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="No saved jobs"
          message="Tap the save icon on a job to keep it here for later."
        />
      </AppScreen>
    );
  }

  if (jobs.length === 0) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Saved jobs unavailable"
          message="Some saved jobs may have expired or are no longer visible."
        />
      </AppScreen>
    );
  }

  const headerComponent = (
    <View style={headerWrapStyle}>
      <AppHeader
        title="Saved Jobs"
        subtitle="Review the opportunities you saved for later"
      />

      <AppCard variant="elevated" padding="lg">
        <View style={heroWrapStyle}>
          <StatusBadge label="Saved" tone="info" />
          <AppText variant="h3">Your saved opportunities</AppText>
          <AppText variant="bodySm" tone="secondary">
            You have {jobs.length} saved job{jobs.length > 1 ? "s" : ""} ready
            to review.
          </AppText>
        </View>
      </AppCard>

      <InlineAlert
        tone="info"
        title="Quick reminder"
        message="Open any saved job to review details and apply."
      />
    </View>
  );

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        initialNumToRender={6}
        windowSize={5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={listContentStyle}
        ListHeaderComponent={headerComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <View style={itemWrapStyle}>
            <Pressable
              onPress={() =>
                navigation.navigate("JobDetail", {
                  jobId: item.id,
                  preview: item,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open saved job ${item.title}`}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.985 : 1,
                },
              ]}
            >
              <JobCard job={item} />
            </Pressable>
          </View>
        )}
      />
    </AppScreen>
  );
}
