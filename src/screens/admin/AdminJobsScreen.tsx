import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../core/supabase";
import { useTheme } from "../../theme/useTheme";
import { AppText } from "../../ui/AppText";
import { AppScreen } from "../../ui/AppScreen";
import { AppCard } from "../../ui/AppCard";
import { InlineAlert } from "../../ui/InlineAlert";
import { EmptyState } from "../../ui/EmptyState";
import { AppButton } from "../../ui/AppButton";
import { StatusBadge } from "../../ui/StatusBadge";
import { SkeletonCard } from "../../ui/Skeleton";

type JobStatus =
  | "draft"
  | "pending_payment"
  | "active"
  | "expired"
  | "deleted"
  | string;

type Job = {
  id: string;
  title: string;
  status: JobStatus;
  created_at: string;
  employer_id: string;
  profiles?: {
    business_name: string | null;
    full_name: string | null;
  } | null;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_payment", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
] as const;

type FilterValue = (typeof STATUS_OPTIONS)[number]["value"];

function mapStatusTone(
  status: JobStatus,
): React.ComponentProps<typeof StatusBadge>["tone"] {
  if (status === "active") return "success";
  if (status === "pending_payment") return "warning";
  if (status === "draft") return "default";
  if (status === "expired" || status === "deleted") return "error";
  return "default";
}

function formatStatus(status: JobStatus) {
  if (status === "pending_payment") return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

export default function AdminJobsScreen() {
  const { theme } = useTheme();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadingRef = useRef(false);

  const load = useCallback(
    async (silent = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      if (!silent) setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("jobs")
          .select(
            `
            id,
            title,
            status,
            created_at,
            employer_id,
            profiles (
              business_name,
              full_name
            )
          `,
          )
          .order("created_at", { ascending: false })
          .limit(200);

        if (filter !== "all") {
          query = query.eq("status", filter);
        }

        const { data, error } = await query;
        if (error) throw error;

        setJobs((data ?? []) as Job[]);
      } catch {
        setError("Failed to load jobs.");
        if (!silent) {
          setJobs([]);
        }
      } finally {
        loadingRef.current = false;
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel("admin-jobs-watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        () => {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            void load(true);
          }, 400);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      if (timeout) clearTimeout(timeout);
    };
  }, [load]);

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs;
    const lower = search.toLowerCase();
    return jobs.filter((j) => j.title.toLowerCase().includes(lower));
  }, [search, jobs]);

  const updateStatus = useCallback(
    async (id: string, status: JobStatus) => {
      if (updatingId) return;

      try {
        setUpdatingId(id);

        const { error } = await supabase
          .from("jobs")
          .update({ status })
          .eq("id", id);

        if (error) throw error;

        setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, status } : j)),
        );
      } catch {
        setError("Failed to update job.");
      } finally {
        setUpdatingId(null);
      }
    },
    [updatingId],
  );

  const softDeleteJob = useCallback(
    async (id: string) => {
      if (updatingId) return;

      try {
        setUpdatingId(id);

        const { error } = await supabase
          .from("jobs")
          .update({ status: "deleted" })
          .eq("id", id);

        if (error) throw error;

        setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, status: "deleted" } : j)),
        );
      } catch {
        setError("Delete failed.");
      } finally {
        setUpdatingId(null);
      }
    },
    [updatingId],
  );

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      backgroundColor: theme.colors.bgApp,
      padding: theme.spacing.lg,
    }),
    [theme.colors.bgApp, theme.spacing.lg],
  );

  const centerStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    }),
    [],
  );

  const loadingTextStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: 8,
    }),
    [],
  );

  const searchWrapStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      marginBottom: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
    }),
    [
      theme.colors.bgSurface,
      theme.colors.borderDefault,
      theme.radius.lg,
      theme.spacing.md,
      theme.spacing.sm,
    ],
  );

  const searchStyle = useMemo(
    () => ({
      flex: 1,
      color: theme.colors.textPrimary,
      paddingVertical: 12,
      fontSize: 14,
    }),
    [theme.colors.textPrimary],
  );

  const filterRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      flexWrap: "wrap",
    }),
    [],
  );

  const filterBtnBase = useMemo<ViewStyle>(
    () => ({
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    }),
    [
      theme.colors.bgSurface,
      theme.colors.borderDefault,
      theme.radius.pill,
      theme.spacing.md,
      theme.spacing.sm,
    ],
  );

  const cardStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: 14,
    }),
    [],
  );

  const cardInnerStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const actionRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    }),
    [theme.spacing.sm, theme.spacing.xs],
  );

  if (loading) {
    return (
      <AppScreen scroll>
        <View style={{ gap: theme.spacing.md }}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <View style={containerStyle}>
        <AppText
          variant="h2"
          weight="700"
          style={{ marginBottom: theme.spacing.md }}
        >
          Manage Jobs
        </AppText>

        {error ? (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <InlineAlert tone="error" message={error} />
          </View>
        ) : null}

        <View style={searchWrapStyle}>
          <Ionicons
            name="search-outline"
            size={18}
            color={theme.colors.textMuted}
          />
          <TextInput
            placeholder="Search job title..."
            style={searchStyle}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 8 }}
          style={{ marginBottom: theme.spacing.md }}
        >
          <View style={filterRowStyle}>
            {STATUS_OPTIONS.map((s) => {
              const active = filter === s.value;
              return (
                <Pressable
                  key={s.value}
                  style={[
                    filterBtnBase,
                    active
                      ? {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primary,
                        }
                      : null,
                  ]}
                  onPress={() => setFilter(s.value)}
                >
                  <AppText
                    variant="caption"
                    weight="600"
                    style={{
                      color: active
                        ? theme.colors.textInverse
                        : theme.colors.textSecondary,
                    }}
                  >
                    {s.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {filteredJobs.length === 0 ? (
          <EmptyState
            title="No jobs found"
            message={
              search.trim()
                ? "Try a different search term."
                : "No jobs match the current filter."
            }
          />
        ) : (
          <FlatList
            data={filteredJobs}
            keyExtractor={(item) => item.id}
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
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const busy = updatingId === item.id;

              return (
                <View style={cardStyle}>
                  <AppCard variant="elevated" padding="lg">
                    <View style={cardInnerStyle}>
                      <View style={{ gap: 4 }}>
                        <AppText variant="bodySm" weight="700">
                          {item.title}
                        </AppText>

                        <AppText variant="caption" tone="secondary">
                          Employer:{" "}
                          {item.profiles?.business_name ||
                            item.profiles?.full_name ||
                            "Unknown"}
                        </AppText>

                        <AppText variant="caption" tone="tertiary">
                          {new Date(item.created_at).toLocaleDateString()}
                        </AppText>
                      </View>

                      <View>
                        <StatusBadge
                          label={formatStatus(item.status)}
                          tone={mapStatusTone(item.status)}
                        />
                      </View>

                      <View style={actionRowStyle}>
                        {item.status !== "active" &&
                        item.status !== "deleted" ? (
                          <AppButton
                            title="Activate"
                            size="sm"
                            fullWidth={false}
                            loading={busy}
                            disabled={busy}
                            onPress={() => void updateStatus(item.id, "active")}
                            variant="secondary"
                          />
                        ) : null}

                        {item.status === "active" ? (
                          <AppButton
                            title="Expire"
                            size="sm"
                            fullWidth={false}
                            loading={busy}
                            disabled={busy}
                            onPress={() =>
                              void updateStatus(item.id, "expired")
                            }
                            variant="secondary"
                          />
                        ) : null}

                        {item.status !== "deleted" ? (
                          <AppButton
                            title="Delete"
                            size="sm"
                            fullWidth={false}
                            loading={busy}
                            disabled={busy}
                            onPress={() => void softDeleteJob(item.id)}
                            variant="destructive"
                          />
                        ) : null}
                      </View>
                    </View>
                  </AppCard>
                </View>
              );
            }}
          />
        )}
      </View>
    </AppScreen>
  );
}
