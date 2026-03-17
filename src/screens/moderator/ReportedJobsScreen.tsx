import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ViewStyle,
} from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { supabase } from "../../core/supabase";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppCard } from "../../ui/AppCard";
import { AppText } from "../../ui/AppText";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { EmptyState } from "../../ui/EmptyState";
import { SkeletonCard } from "../../ui/Skeleton";

type ReportedJob = {
  id: string;
  title: string;
  employer_id: string;
  reports_count: number;
  created_at: string;
  status: string;
};

export default function ReportedJobsScreen() {
  const { theme } = useTheme();

  const [jobs, setJobs] = useState<ReportedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [suspendingEmployerId, setSuspendingEmployerId] = useState<
    string | null
  >(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,employer_id,reports_count,created_at,status")
        .eq("status", "flagged")
        .order("reports_count", { ascending: false })
        .limit(50);

      if (error) throw error;
      setJobs((data ?? []) as ReportedJob[]);
    } catch {
      setError("Could not load reported jobs.");
      if (!silent) setJobs([]);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("reported-jobs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        () => {
          void load(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const approveJob = useCallback(async (id: string) => {
    try {
      setActionLoadingId(id);
      setError(null);

      const { error } = await supabase
        .from("jobs")
        .update({ status: "active", reports_count: 0 })
        .eq("id", id);

      if (error) throw error;

      setJobs((prev) => prev.filter((job) => job.id !== id));
    } catch {
      setError("Failed to approve job.");
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  const removeJob = useCallback(async (id: string) => {
    try {
      setActionLoadingId(id);
      setError(null);

      const { error } = await supabase
        .from("jobs")
        .update({ status: "removed" })
        .eq("id", id);

      if (error) throw error;

      setJobs((prev) => prev.filter((job) => job.id !== id));
    } catch {
      setError("Failed to remove job.");
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  const suspendEmployer = useCallback(async (employerId: string) => {
    try {
      setSuspendingEmployerId(employerId);
      setError(null);

      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: true })
        .eq("id", employerId);

      if (error) throw error;
    } catch {
      setError("Failed to suspend employer.");
    } finally {
      setSuspendingEmployerId(null);
    }
  }, []);

  const loadingWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      justifyContent: "center",
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const listContentStyle = useMemo<ViewStyle>(
    () => ({
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xxxl,
    }),
    [theme.spacing.md, theme.spacing.xxxl],
  );

  if (loading) {
    return (
      <AppScreen scroll>
        <View style={loadingWrapStyle}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
            }}
          >
            <ActivityIndicator color={theme.colors.primary} />
            <AppText variant="bodySm" tone="secondary">
              Loading reported jobs...
            </AppText>
          </View>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      </AppScreen>
    );
  }

  if (!jobs.length && !error) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="No flagged jobs"
          message="Everything looks clean right now."
        />
      </AppScreen>
    );
  }

  if (!jobs.length && error) {
    return (
      <AppScreen centerContent>
        <EmptyState title="Reported jobs unavailable" message={error} />
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View
            style={{ gap: theme.spacing.md, marginBottom: theme.spacing.sm }}
          >
            <AppText variant="h2" weight="700">
              Reported Jobs
            </AppText>

            {error ? <InlineAlert tone="error" message={error} /> : null}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => {
          const busy = actionLoadingId === item.id;
          const suspending = suspendingEmployerId === item.employer_id;

          return (
            <View style={{ marginBottom: theme.spacing.sm }}>
              <AppCard variant="elevated" padding="lg">
                <View style={{ gap: theme.spacing.md }}>
                  <View style={{ gap: 6 }}>
                    <AppText variant="bodySm" weight="700">
                      {item.title}
                    </AppText>

                    <AppText variant="caption" tone="secondary">
                      {item.reports_count} reports •{" "}
                      {new Date(item.created_at).toLocaleDateString()}
                    </AppText>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: theme.spacing.sm,
                    }}
                  >
                    <AppButton
                      title="Approve"
                      onPress={() => void approveJob(item.id)}
                      loading={busy}
                      disabled={busy || suspending}
                      size="sm"
                      fullWidth={false}
                      variant="secondary"
                    />

                    <AppButton
                      title="Remove"
                      onPress={() => void removeJob(item.id)}
                      loading={busy}
                      disabled={busy || suspending}
                      size="sm"
                      fullWidth={false}
                      variant="destructive"
                    />

                    <AppButton
                      title="Suspend Employer"
                      onPress={() => void suspendEmployer(item.employer_id)}
                      loading={suspending}
                      disabled={busy || suspending}
                      size="sm"
                      fullWidth={false}
                      variant="ghost"
                    />
                  </View>
                </View>
              </AppCard>
            </View>
          );
        }}
      />
    </AppScreen>
  );
}
