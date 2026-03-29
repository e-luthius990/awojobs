import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View, type ViewStyle } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../core/supabase";
import { useSession } from "../../state/useSession";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { EmptyState } from "../../ui/EmptyState";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";
import { SkeletonCard } from "../../ui/Skeleton";
import { AppEntrance } from "../../ui/AppEntrance";

/* ================= TYPES ================= */

type RecentJob = {
  id: string;
  title: string;
  status: string;
  views: number;
  expires_in_days: number | null;
};

type DashboardData = {
  full_name: string | null;
  phone_number: string | null;
  active_jobs: number;
  pending_jobs: number;
  expired_jobs: number;
  new_applications: number;
  recent_jobs: RecentJob[];
};

/* ================= HELPERS ================= */

function getJobStatusTone(
  status: string,
): React.ComponentProps<typeof StatusBadge>["tone"] {
  if (status === "active") return "success";
  if (status === "pending_payment" || status === "pending") return "warning";
  if (status === "expired" || status === "closed") return "default";
  return "default";
}

function formatJobStatus(status: string) {
  if (status === "pending_payment") return "Pending Payment";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/* ================= COMPONENTS ================= */

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

/* ================= SCREEN ================= */

export default function EmployerDashboardScreen({ navigation }: any) {
  const { session } = useSession();
  const { theme } = useTheme();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user?.id;
  const cacheKey = `employer_dashboard_cache_${userId}`;

  const loadDashboard = useCallback(async () => {
    if (!userId) {
      setData(null);
      setError("Dashboard unavailable.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "employer_dashboard_summary",
        {
          p_employer_id: userId,
        },
      );

      if (rpcError || !rpcData) {
        throw rpcError ?? new Error("Dashboard unavailable.");
      }

      setData(rpcData);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(rpcData));
    } catch {
      if (!data) {
        setError("We could not load your employer dashboard right now.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cacheKey, data, userId]);

  useEffect(() => {
    if (!userId) return;

    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (!cached) return;

        const parsed = JSON.parse(cached) as DashboardData;
        setData(parsed);
        setLoading(false);
      } catch {
        // ignore bad cache
      }
    };

    void loadCache();
  }, [cacheKey, userId]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`dashboard-app-updates-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "applications",
          filter: `employer_id=eq.${userId}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, loadDashboard]);

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
      paddingHorizontal: theme.spacing.screenX,
      paddingTop: theme.spacing.md,
    }),
    [
      theme.spacing.lg,
      theme.spacing.md,
      theme.spacing.screenX,
      theme.spacing.xxxl,
    ],
  );

  const heroWrapStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.sm }),
    [theme.spacing.sm],
  );

  const actionRowStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.sm }),
    [theme.spacing.sm],
  );

  const statsRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const recentJobsWrapStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.sm }),
    [theme.spacing.sm],
  );

  const sectionHeaderStyle = useMemo<ViewStyle>(() => ({ gap: 4 }), []);

  const jobCardContentStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.sm }),
    [theme.spacing.sm],
  );

  const jobTopRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const loaderWrapStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.md }),
    [theme.spacing.md],
  );

  if (loading) {
    return (
      <AppScreen scroll>
        <View style={loaderWrapStyle}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      </AppScreen>
    );
  }

  if (!data && error) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Dashboard unavailable"
          message={error}
          action={
            <AppButton
              title="Retry"
              onPress={() => {
                setLoading(true);
                void loadDashboard();
              }}
              variant="primary"
            />
          }
        />
      </AppScreen>
    );
  }

  if (!data) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Dashboard unavailable"
          message="We could not load your employer dashboard right now."
          action={
            <AppButton
              title="Retry"
              onPress={() => {
                setLoading(true);
                void loadDashboard();
              }}
              variant="primary"
            />
          }
        />
      </AppScreen>
    );
  }

  const showBundlePrompt = data.expired_jobs >= 2 || data.active_jobs >= 3;

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentStyle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadDashboard();
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        <AppEntrance delay={0}>
          <AppCard variant="elevated" padding="lg">
            <View style={heroWrapStyle}>
              <AppText variant="h3">
                {data?.full_name?.trim() || "Employer"}
              </AppText>

              <AppText variant="bodySm" tone="secondary">
                {data?.phone_number?.trim() || "No phone number available"}
              </AppText>
            </View>
          </AppCard>
        </AppEntrance>

        <AppEntrance delay={40}>
          <View style={actionRowStyle}>
            <AppButton
              title="Post Job"
              onPress={() => navigation.navigate("PostJobFlow")}
              variant="primary"
            />

            <AppButton
              title="Applications"
              onPress={() => navigation.navigate("ApplicationsInbox")}
              variant="secondary"
            />
          </View>
        </AppEntrance>

        <AppEntrance delay={80}>
          <View style={statsRowStyle}>
            <QuickStat label="Active" value={data.active_jobs} />
            <QuickStat label="Pending" value={data.pending_jobs} />
            <QuickStat label="Expired" value={data.expired_jobs} />
          </View>
        </AppEntrance>

        {data.new_applications > 0 ? (
          <InlineAlert
            tone="success"
            title={`${data.new_applications} new application${data.new_applications > 1 ? "s" : ""}`}
            message="Review your latest candidates and respond quickly."
            action={
              <AppButton
                title="Open Inbox"
                onPress={() => navigation.navigate("ApplicationsInbox")}
                variant="secondary"
              />
            }
          />
        ) : null}

        {error ? <InlineAlert tone="warning" message={error} /> : null}

        {showBundlePrompt ? (
          <AppCard variant="premium" padding="lg">
            <View style={{ gap: 10 }}>
              <StatusBadge label="Save More" tone="premium" />
              <AppText variant="titleLg">Save more on job posts</AppText>
              <AppText variant="bodySm" tone="secondary">
                Post multiple jobs and reduce repeated payment friction with
                bundle plans.
              </AppText>
            </View>
          </AppCard>
        ) : null}

        <View style={recentJobsWrapStyle}>
          <View style={sectionHeaderStyle}>
            <AppText variant="titleLg">Recent Jobs</AppText>
            <AppText variant="bodySm" tone="secondary">
              Review status, expiry, and performance for your latest posts.
            </AppText>
          </View>

          {data.recent_jobs?.length === 0 ? (
            <EmptyState
              title="No jobs yet"
              message="Post your first job to start receiving applications."
            />
          ) : null}
        </View>

        {data.recent_jobs?.map((job) => (
          <AppCard key={job.id} variant="elevated" padding="lg">
            <View style={jobCardContentStyle}>
              <View style={jobTopRowStyle}>
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="title" numberOfLines={2}>
                    {job.title}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {job.views} view{job.views !== 1 ? "s" : ""}
                  </AppText>
                </View>

                <StatusBadge
                  label={formatJobStatus(job.status)}
                  tone={getJobStatusTone(job.status)}
                />
              </View>

              {job.status === "active" && job.expires_in_days !== null ? (
                <AppText
                  variant="bodySm"
                  tone={job.expires_in_days <= 3 ? "error" : "secondary"}
                >
                  Expires in {job.expires_in_days} day
                  {job.expires_in_days !== 1 ? "s" : ""}
                </AppText>
              ) : null}

              {job.status === "expired" ? (
                <AppButton
                  title="Renew"
                  onPress={() =>
                    navigation.navigate("PostJobFlow", {
                      screen: "Payment",
                      params: {
                        draftId: job.id,
                        mode: "renew",
                      },
                    })
                  }
                  variant="secondary"
                />
              ) : null}
            </View>
          </AppCard>
        ))}
      </ScrollView>
    </AppScreen>
  );
}
