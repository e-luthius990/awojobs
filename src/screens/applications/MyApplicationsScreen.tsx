import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  FlatList,
  RefreshControl,
  Pressable,
  View,
  type ViewStyle,
} from "react-native";
import { supabase } from "../../core/supabase";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppCard } from "../../ui/AppCard";
import { AppText } from "../../ui/AppText";
import { EmptyState } from "../../ui/EmptyState";
import { InlineAlert } from "../../ui/InlineAlert";
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
  user_id?: string;
  status: ApplicationStatus;
  created_at: string;
  job: {
    id: string;
    title: string;
    location_id: string;
  } | null;
};

type ScreenProps = {
  navigation: any;
};

function mapStatusTone(
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

function formatStatusLabel(status: ApplicationStatus) {
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

function QuickStat({ label, value }: { label: string; value: number }) {
  return (
    <AppCard variant="elevated" padding="lg" style={{ flex: 1 }}>
      <View style={{ gap: 4 }}>
        <AppText variant="caption" tone="secondary" uppercase>
          {label}
        </AppText>
        <AppText variant="h2">{value}</AppText>
      </View>
    </AppCard>
  );
}

export default function MyApplicationsScreen({ navigation }: ScreenProps) {
  const { theme } = useTheme();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;

    if (!silent) {
      setLoading(true);
    }

    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setIsSignedIn(false);
        setUserId(null);
        setApplications([]);
        return;
      }

      setIsSignedIn(true);
      setUserId(user.id);

      const { data, error } = await supabase
        .from("applications")
        .select(
          `
            id,
            user_id,
            status,
            created_at,
            job:jobs (
              id,
              title,
              location_id
            )
          `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      setApplications((data as Application[]) ?? []);
    } catch {
      setApplications([]);
      setError("Could not load your applications right now.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`applications-status-updates-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void load({ silent: true });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const counts = useMemo(() => {
    let pending = 0;
    let reviewed = 0;
    let shortlisted = 0;
    let rejected = 0;
    let hired = 0;

    for (const app of applications) {
      if (app.status === "pending") pending += 1;
      else if (app.status === "reviewed") reviewed += 1;
      else if (app.status === "shortlisted") shortlisted += 1;
      else if (app.status === "rejected") rejected += 1;
      else if (app.status === "hired") hired += 1;
    }

    return {
      total: applications.length,
      pending,
      reviewed,
      shortlisted,
      rejected,
      hired,
    };
  }, [applications]);

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

  const statRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
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

  const cardContentStyle = useMemo<ViewStyle>(
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

  const titleWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const metaRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
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
          <AppHeader title="My Applications" />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      </AppScreen>
    );
  }

  if (!isSignedIn) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Sign in required"
          message="Sign in to view and track your job applications."
        />
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Could not load applications"
          message={error}
          action={
            <Pressable onPress={() => void load()}>
              <AppText variant="labelLg" tone="link" weight="700">
                Try again
              </AppText>
            </Pressable>
          }
        />
      </AppScreen>
    );
  }

  if (!applications.length) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="No applications yet"
          message="When you apply for jobs, they will appear here."
        />
      </AppScreen>
    );
  }

  function renderItem({ item }: { item: Application }) {
    return (
      <View style={itemWrapStyle}>
        <Pressable
          onPress={() =>
            navigation.navigate("ApplicationDetails", {
              applicationId: item.id,
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`Open application for ${item.job?.title ?? "job"}`}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.985 : 1,
            },
          ]}
        >
          <AppCard variant="elevated" padding="lg">
            <View style={cardContentStyle}>
              <View style={topRowStyle}>
                <View style={titleWrapStyle}>
                  <AppText variant="title" numberOfLines={2}>
                    {item.job?.title ?? "Job no longer available"}
                  </AppText>

                  <AppText variant="bodySm" tone="secondary">
                    Applied on{" "}
                    {new Date(item.created_at).toLocaleDateString("en-UG")}
                  </AppText>
                </View>

                <StatusBadge
                  label={formatStatusLabel(item.status)}
                  tone={mapStatusTone(item.status)}
                />
              </View>

              <View style={metaRowStyle}>
                <AppText variant="caption" tone="tertiary">
                  Track progress and review details
                </AppText>

                <AppText variant="caption" tone="secondary" weight="700">
                  Open
                </AppText>
              </View>
            </View>
          </AppCard>
        </Pressable>
      </View>
    );
  }

  const headerComponent = (
    <View style={headerWrapStyle}>
      <AppHeader
        title="My Applications"
        subtitle="Track progress across the jobs you’ve applied for"
      />

      <AppCard variant="elevated" padding="lg">
        <View style={heroWrapStyle}>
          <StatusBadge label="Overview" tone="info" />
          <AppText variant="h3">Your application activity</AppText>
          <AppText variant="bodySm" tone="secondary">
            Review your application progress, shortlisted roles, and updates
            from employers.
          </AppText>
        </View>
      </AppCard>

      <View style={statRowStyle}>
        <QuickStat label="Total" value={counts.total} />
        <QuickStat label="Pending" value={counts.pending} />
      </View>

      {counts.shortlisted > 0 ? (
        <InlineAlert
          tone="success"
          title="Good news"
          message={`You have ${counts.shortlisted} shortlisted application${counts.shortlisted > 1 ? "s" : ""}.`}
        />
      ) : null}

      {counts.reviewed > 0 ? (
        <InlineAlert
          tone="info"
          title="Applications under review"
          message={`${counts.reviewed} application${counts.reviewed > 1 ? "s are" : " is"} currently being reviewed.`}
        />
      ) : null}
    </View>
  );

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <FlatList
        data={applications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={10}
        windowSize={5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={listContentStyle}
        ListHeaderComponent={headerComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
          />
        }
      />
    </AppScreen>
  );
}
