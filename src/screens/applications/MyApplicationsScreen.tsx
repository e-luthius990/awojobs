import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, FlatList, RefreshControl, type ViewStyle } from "react-native";
import { supabase } from "../../core/supabase";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppCard } from "../../ui/AppCard";
import { AppHeader } from "../../ui/AppHeader";
import { AppText } from "../../ui/AppText";
import { InlineAlert } from "../../ui/InlineAlert";
import { EmptyState } from "../../ui/EmptyState";
import { StatusBadge } from "../../ui/StatusBadge";
import { SkeletonCard } from "../../ui/Skeleton";

type ApplicationStatus =
  | "pending"
  | "reviewed"
  | "shortlisted"
  | "rejected"
  | "hired";

type Application = {
  id: string;
  user_id: string;
  status: ApplicationStatus;
  created_at: string;
  job: {
    id: string;
    title: string;
  } | null;
};

function formatStatus(status: ApplicationStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "reviewed":
      return "Reviewed";
    case "shortlisted":
      return "Shortlisted";
    case "rejected":
      return "Rejected";
    case "hired":
      return "Hired";
    default:
      return status;
  }
}

function statusTone(
  status: ApplicationStatus,
): React.ComponentProps<typeof StatusBadge>["tone"] {
  switch (status) {
    case "pending":
      return "warning";
    case "reviewed":
      return "info";
    case "shortlisted":
      return "success";
    case "rejected":
      return "error";
    case "hired":
      return "success";
    default:
      return "default";
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString();
}

export default function MyApplicationsScreen() {
  const { theme } = useTheme();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.screenX,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxxl,
    }),
    [theme.spacing.md, theme.spacing.screenX, theme.spacing.xxxl],
  );

  const heroWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const statsRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const cardBodyStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const topRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw authError ?? new Error("Not authenticated");
        }

        const { data, error: queryError } = await supabase
          .from("applications")
          .select(
            `
            id,
            user_id,
            status,
            created_at,
            job:jobs (
              id,
              title
            )
          `,
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;

        setApplications((data ?? []) as Application[]);
      } catch {
        setError("Could not load your applications right now.");
        if (!silent) {
          setApplications([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) return;

      channel = supabase
        .channel(`my-applications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "applications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void load({ silent: true });
          },
        )
        .subscribe();
    };

    void setup();

    return () => {
      active = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [load]);

  const counts = useMemo(() => {
    return applications.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === "pending") acc.pending += 1;
        if (item.status === "reviewed") acc.reviewed += 1;
        if (item.status === "shortlisted") acc.shortlisted += 1;
        if (item.status === "rejected") acc.rejected += 1;
        if (item.status === "hired") acc.hired += 1;
        return acc;
      },
      {
        total: 0,
        pending: 0,
        reviewed: 0,
        shortlisted: 0,
        rejected: 0,
        hired: 0,
      },
    );
  }, [applications]);

  const summaryTitle =
    counts.shortlisted > 0
      ? `${counts.shortlisted} shortlisted role${
          counts.shortlisted > 1 ? "s" : ""
        }`
      : `${counts.pending} pending application${counts.pending > 1 ? "s" : ""}`;

  if (loading) {
    return (
      <AppScreen scroll>
        <View style={{ gap: theme.spacing.md }}>
          <AppHeader
            title="My Applications"
            subtitle="Track your application progress."
          />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <FlatList
        data={applications}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentStyle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md }}>
            <AppHeader
              title="My Applications"
              subtitle="Track your application progress."
            />

            <AppCard variant="elevated" padding="lg">
              <View style={heroWrapStyle}>
                <AppText variant="h3">{summaryTitle}</AppText>
                <AppText variant="bodySm" tone="secondary">
                  Your latest application statuses appear below.
                </AppText>
              </View>
            </AppCard>

            <View style={statsRowStyle}>
              <AppCard variant="elevated" padding="lg" style={{ flex: 1 }}>
                <View style={{ gap: 4 }}>
                  <AppText variant="caption" tone="secondary" uppercase>
                    Total
                  </AppText>
                  <AppText variant="h2">{counts.total}</AppText>
                </View>
              </AppCard>

              <AppCard variant="elevated" padding="lg" style={{ flex: 1 }}>
                <View style={{ gap: 4 }}>
                  <AppText variant="caption" tone="secondary" uppercase>
                    Pending
                  </AppText>
                  <AppText variant="h2">{counts.pending}</AppText>
                </View>
              </AppCard>

              <AppCard variant="elevated" padding="lg" style={{ flex: 1 }}>
                <View style={{ gap: 4 }}>
                  <AppText variant="caption" tone="secondary" uppercase>
                    Shortlisted
                  </AppText>
                  <AppText variant="h2">{counts.shortlisted}</AppText>
                </View>
              </AppCard>
            </View>

            {error ? <InlineAlert tone="warning" message={error} /> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No applications yet"
            message="Jobs you apply for will appear here."
          />
        }
        renderItem={({ item }) => (
          <AppCard variant="elevated" padding="lg">
            <View style={cardBodyStyle}>
              <View style={topRowStyle}>
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="title">
                    {item.job?.title?.trim() || "Untitled job"}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    Applied {formatDate(item.created_at)}
                  </AppText>
                </View>

                <StatusBadge
                  label={formatStatus(item.status)}
                  tone={statusTone(item.status)}
                />
              </View>

              {item.status === "shortlisted" ? (
                <InlineAlert
                  tone="success"
                  message="You have been shortlisted for this role."
                />
              ) : null}

              {item.status === "rejected" ? (
                <InlineAlert
                  tone="warning"
                  message="This application was not successful."
                />
              ) : null}
            </View>
          </AppCard>
        )}
      />
    </AppScreen>
  );
}
