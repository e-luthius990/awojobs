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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../core/supabase";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppCard } from "../../ui/AppCard";
import { AppText } from "../../ui/AppText";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { EmptyState } from "../../ui/EmptyState";
import { SkeletonCard } from "../../ui/Skeleton";

type FlaggedJob = {
  id: string;
  title: string;
  employer_id: string;
  created_at: string;
  reports_count: number;
};

type ModeratorSummary = {
  flagged_jobs: number;
  pending_reviews: number;
  suspended_users: number;
};

export default function ModeratorDashboard() {
  const { theme } = useTheme();

  const [summary, setSummary] = useState<ModeratorSummary | null>(null);
  const [flaggedJobs, setFlaggedJobs] = useState<FlaggedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const [
        { data: summaryData, error: summaryError },
        { data: jobs, error: jobsError },
      ] = await Promise.all([
        supabase.rpc("moderator_dashboard_summary"),
        supabase
          .from("jobs")
          .select("id,title,employer_id,created_at,reports_count")
          .eq("status", "flagged")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (summaryError) throw summaryError;
      if (jobsError) throw jobsError;

      setSummary(summaryData ?? null);
      setFlaggedJobs((jobs ?? []) as FlaggedJob[]);
    } catch {
      setError("Failed to load moderator data.");
      if (!silent) {
        setSummary(null);
        setFlaggedJobs([]);
      }
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
      .channel("moderator-jobs")
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
        .update({ status: "active" })
        .eq("id", id);

      if (error) throw error;

      setFlaggedJobs((prev) => prev.filter((job) => job.id !== id));
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              flagged_jobs: Math.max(0, prev.flagged_jobs - 1),
              pending_reviews: Math.max(0, prev.pending_reviews - 1),
            }
          : prev,
      );
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

      setFlaggedJobs((prev) => prev.filter((job) => job.id !== id));
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              flagged_jobs: Math.max(0, prev.flagged_jobs - 1),
              pending_reviews: Math.max(0, prev.pending_reviews - 1),
            }
          : prev,
      );
    } catch {
      setError("Failed to remove job.");
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.md,
    }),
    [theme.spacing.xxxl, theme.spacing.md],
  );

  const statsRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const sectionTitleStyle = useMemo(
    () => ({
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    }),
    [theme.spacing.sm, theme.spacing.xs],
  );

  if (loading) {
    return (
      <AppScreen scroll>
        <View style={{ gap: theme.spacing.md }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      </AppScreen>
    );
  }

  if (!summary && flaggedJobs.length === 0 && error) {
    return (
      <AppScreen centerContent>
        <EmptyState title="Moderator panel unavailable" message={error} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <FlatList
        data={flaggedJobs}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentStyle}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="h2" weight="700">
              Moderator Panel
            </AppText>

            {error ? <InlineAlert tone="error" message={error} /> : null}

            <View style={statsRowStyle}>
              <StatCard
                label="Flagged Jobs"
                value={summary?.flagged_jobs ?? 0}
                icon="alert-circle-outline"
                tone="warning"
              />
              <StatCard
                label="Pending Reviews"
                value={summary?.pending_reviews ?? 0}
                icon="time-outline"
                tone="warning"
              />
              <StatCard
                label="Suspended Users"
                value={summary?.suspended_users ?? 0}
                icon="ban-outline"
                tone="error"
              />
            </View>

            <AppText variant="labelLg" weight="700" style={sectionTitleStyle}>
              Flagged Jobs
            </AppText>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No flagged jobs"
            message="There are no flagged jobs waiting for review right now."
          />
        }
        renderItem={({ item }) => (
          <FlaggedJobCard
            item={item}
            busy={actionLoadingId === item.id}
            onApprove={() => void approveJob(item.id)}
            onRemove={() => void removeJob(item.id)}
          />
        )}
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
      />
    </AppScreen>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "warning" | "error" | "success";
}) {
  const { theme } = useTheme();

  const color =
    tone === "success"
      ? theme.colors.success
      : tone === "warning"
        ? theme.colors.warning
        : theme.colors.error;

  return (
    <AppCard variant="elevated" padding="md" style={{ flex: 1 }}>
      <View style={{ gap: 6, alignItems: "center" }}>
        <Ionicons name={icon} size={22} color={color} />
        <AppText variant="h3" weight="700">
          {value}
        </AppText>
        <AppText variant="caption" tone="secondary" align="center">
          {label}
        </AppText>
      </View>
    </AppCard>
  );
}

function FlaggedJobCard({
  item,
  busy,
  onApprove,
  onRemove,
}: {
  item: FlaggedJob;
  busy: boolean;
  onApprove: () => void;
  onRemove: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ marginBottom: theme.spacing.sm }}>
      <AppCard variant="elevated" padding="lg">
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: 4 }}>
            <AppText variant="bodySm" weight="700">
              {item.title}
            </AppText>

            <AppText variant="caption" tone="secondary">
              {item.reports_count} reports •{" "}
              {new Date(item.created_at).toLocaleDateString()}
            </AppText>
          </View>

          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <AppButton
              title="Approve"
              onPress={onApprove}
              loading={busy}
              disabled={busy}
              size="sm"
              fullWidth={false}
              variant="secondary"
            />

            <AppButton
              title="Remove"
              onPress={onRemove}
              loading={busy}
              disabled={busy}
              size="sm"
              fullWidth={false}
              variant="destructive"
            />
          </View>
        </View>
      </AppCard>
    </View>
  );
}
