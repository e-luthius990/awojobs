import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ToastAndroid,
  View,
  type ViewStyle,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { supabase } from "../../core/supabase";
import { fetchMyJobs } from "../../jobs/jobs.mine";
import type { EmployerRootStackParamList } from "../../navigation/EmployerNavigator";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { AppText } from "../../ui/AppText";
import { EmptyState } from "../../ui/EmptyState";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";
import { SkeletonCard } from "../../ui/Skeleton";

type EmployerNavProp = NativeStackNavigationProp<EmployerRootStackParamList>;

type JobStatus = "draft" | "pending_payment" | "active" | "expired" | "closed";

type EmployerJob = {
  id: string;
  title: string;
  status: JobStatus;
  expires_at: string | null;
  views_count: number | null;
  applications_count: number | null;
  is_sponsored: boolean | null;
  sponsored_until: string | null;
  created_at: string;
};

function daysLeft(ts?: string | null) {
  if (!ts) return null;
  const diff = new Date(ts).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function toast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  }
}

function statusLabel(s: JobStatus) {
  if (s === "pending_payment") return "Pending Payment";
  if (s === "draft") return "Draft";
  if (s === "active") return "Active";
  if (s === "expired") return "Expired";
  return "Closed";
}

function statusTone(
  s: JobStatus,
): React.ComponentProps<typeof StatusBadge>["tone"] {
  if (s === "active") return "success";
  if (s === "pending_payment") return "warning";
  if (s === "expired") return "error";
  if (s === "draft") return "info";
  return "default";
}

function isBoostActive(job: EmployerJob) {
  if (!job.is_sponsored) return false;
  if (!job.sponsored_until) return false;
  return new Date(job.sponsored_until).getTime() > Date.now();
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

export default function MyJobsScreen() {
  const navigation = useNavigation<EmployerNavProp>();
  const { theme } = useTheme();

  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const inFlightRef = useRef(false);

  const setBusy = useCallback((jobId: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  }, []);

  const load = useCallback(async (spinner = true) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (spinner) setLoading(true);
    setError(null);

    try {
      const data = await fetchMyJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load your jobs.");
      if (spinner) {
        setJobs([]);
      }
    } finally {
      if (spinner) setLoading(false);
      setRefreshing(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
  }, [load]);

  const normalized = useMemo(() => {
    const now = Date.now();

    return jobs.map((j) => {
      if (j.status === "active" && j.expires_at) {
        const exp = new Date(j.expires_at).getTime();
        if (!Number.isNaN(exp) && exp <= now) {
          return { ...j, status: "expired" as const };
        }
      }
      return j;
    });
  }, [jobs]);

  const groups = useMemo(() => {
    const expired: EmployerJob[] = [];
    const pending: EmployerJob[] = [];
    const active: EmployerJob[] = [];
    const draft: EmployerJob[] = [];
    const closed: EmployerJob[] = [];

    for (const j of normalized) {
      if (j.status === "expired") expired.push(j);
      else if (j.status === "pending_payment") pending.push(j);
      else if (j.status === "active") active.push(j);
      else if (j.status === "draft") draft.push(j);
      else closed.push(j);
    }

    const byCreatedDesc = (a: EmployerJob, b: EmployerJob) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

    expired.sort(byCreatedDesc);
    pending.sort(byCreatedDesc);
    active.sort(byCreatedDesc);
    draft.sort(byCreatedDesc);
    closed.sort(byCreatedDesc);

    return { expired, pending, active, draft, closed };
  }, [normalized]);

  const ordered = useMemo(
    () => [
      ...groups.expired,
      ...groups.pending,
      ...groups.active,
      ...groups.draft,
      ...groups.closed,
    ],
    [groups],
  );

  const activeCount = groups.active.length;
  const totalCount = normalized.length;
  const expiredCount = groups.expired.length;
  const pendingCount = groups.pending.length;
  const draftCount = groups.draft.length;

  async function optimisticUpdate(
    jobId: string,
    patch: Partial<EmployerJob>,
    fn: () => Promise<void>,
    failMsg: string,
  ) {
    if (busyIds.has(jobId)) return;

    const prev = jobs;
    setBusy(jobId, true);
    setJobs((cur) => cur.map((j) => (j.id === jobId ? { ...j, ...patch } : j)));

    try {
      await fn();
    } catch {
      setJobs(prev);
      setError(failMsg);
    } finally {
      setBusy(jobId, false);
    }
  }

  function confirmClose(job: EmployerJob) {
    Alert.alert(
      "Close this job?",
      "Applicants will no longer see this job. You can renew later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close job",
          style: "destructive",
          onPress: () => {
            void closeJob(job.id);
          },
        },
      ],
    );
  }

  async function closeJob(jobId: string) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("You are not signed in.");
      return;
    }

    await optimisticUpdate(
      jobId,
      { status: "closed" },
      async () => {
        const { error } = await supabase
          .from("jobs")
          .update({ status: "closed" })
          .eq("id", jobId)
          .eq("employer_id", user.id);

        if (error) throw error;
        toast("Job closed");
      },
      "Could not close job.",
    );
  }

  function renewJob(job: EmployerJob) {
    navigation.navigate("PostJobFlow", {
      screen: "Payment",
      params: {
        draftId: job.id,
        mode: "renew",
      },
    });
  }

  function sponsorJob(job: EmployerJob) {
    navigation.navigate("PostJobFlow", {
      screen: "SponsorPayment",
      params: {
        jobId: job.id,
      },
    });
  }

  function continuePayment(job: EmployerJob) {
    navigation.navigate("PostJobFlow", {
      screen: "Payment",
      params: {
        draftId: job.id,
        mode: "renew",
      },
    });
  }

  function editDraft(job: EmployerJob) {
    navigation.navigate("PostJobFlow", {
      screen: "PostJob",
      params: {
        jobId: job.id,
        mode: "edit",
      },
    });
  }

  async function deleteDraft(job: EmployerJob) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("You are not signed in.");
      return;
    }

    if (busyIds.has(job.id)) return;

    const prev = jobs;
    setBusy(job.id, true);
    setJobs((cur) => cur.filter((j) => j.id !== job.id));

    const { error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", job.id)
      .eq("employer_id", user.id)
      .eq("status", "draft");

    if (error) {
      setJobs(prev);
      setError("Could not delete draft.");
      setBusy(job.id, false);
      return;
    }

    setBusy(job.id, false);
    toast("Draft deleted");
  }

  const headerBlockStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const heroWrapStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.sm }),
    [theme.spacing.sm],
  );

  const statsGridStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const listContentStyle = useMemo<ViewStyle>(
    () => ({
      paddingBottom: theme.spacing.xxxl,
      paddingHorizontal: theme.spacing.screenX,
      paddingTop: theme.spacing.md,
    }),
    [theme.spacing.xxxl, theme.spacing.screenX, theme.spacing.md],
  );

  const cardContentStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.md }),
    [theme.spacing.md],
  );

  const topRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
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
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const actionRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const loaderWrapStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.md }),
    [theme.spacing.md],
  );

  const itemWrapStyle = useMemo<ViewStyle>(
    () => ({ marginBottom: theme.spacing.sm }),
    [theme.spacing.sm],
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

  if (error && ordered.length === 0) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Jobs unavailable"
          message={error}
          action={
            <AppButton
              title="Retry"
              onPress={() => {
                setLoading(true);
                void load(true);
              }}
              variant="primary"
            />
          }
        />
      </AppScreen>
    );
  }

  if (ordered.length === 0) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="No jobs yet"
          message="Post your first job to start receiving views and applications."
          action={
            <AppButton
              title="Post Job"
              onPress={() => navigation.navigate("PostJobFlow")}
              variant="primary"
            />
          }
        />
      </AppScreen>
    );
  }

  const renderJob = ({ item }: { item: EmployerJob }) => {
    const jobExpires = daysLeft(item.expires_at);
    const boostExpires = daysLeft(item.sponsored_until);

    const views = item.views_count ?? 0;
    const apps = item.applications_count ?? 0;

    const boostActive = isBoostActive(item);
    const isBusy = busyIds.has(item.id);

    const shouldPromptBoost =
      item.status === "active" && !boostActive && views < 20;

    const shouldPromptExtend =
      item.status === "active" &&
      boostActive &&
      boostExpires !== null &&
      boostExpires <= 2;

    return (
      <View style={itemWrapStyle}>
        <AppCard
          variant={
            item.status === "expired"
              ? "muted"
              : item.status === "pending_payment"
                ? "premium"
                : "elevated"
          }
          padding="lg"
        >
          <View style={cardContentStyle}>
            <View style={topRowStyle}>
              <View style={titleWrapStyle}>
                <AppText variant="titleLg" numberOfLines={2}>
                  {item.title}
                </AppText>

                <View style={metaRowStyle}>
                  <StatusBadge
                    label={statusLabel(item.status)}
                    tone={statusTone(item.status)}
                  />
                  {boostActive ? (
                    <StatusBadge label="Boost Active" tone="sponsored" />
                  ) : null}
                </View>
              </View>
            </View>

            {item.status === "active" && jobExpires !== null ? (
              <AppText
                variant="bodySm"
                tone={jobExpires <= 3 ? "error" : "secondary"}
                weight={jobExpires <= 3 ? "700" : "400"}
              >
                Job expires in {jobExpires} day{jobExpires !== 1 ? "s" : ""}
              </AppText>
            ) : null}

            {item.status === "active" &&
            boostActive &&
            boostExpires !== null ? (
              <AppText
                variant="bodySm"
                tone={boostExpires <= 2 ? "warning" : "secondary"}
                weight={boostExpires <= 2 ? "700" : "400"}
              >
                Boost ends in {boostExpires} day
                {boostExpires !== 1 ? "s" : ""}
              </AppText>
            ) : null}

            <View style={metaRowStyle}>
              <AppText variant="bodySm" tone="secondary">
                {views} views
              </AppText>
              <AppText variant="bodySm" tone="tertiary">
                •
              </AppText>
              <AppText variant="bodySm" tone="secondary">
                {apps} applications
              </AppText>
            </View>

            {shouldPromptBoost || shouldPromptExtend ? (
              <InlineAlert
                tone="warning"
                title={
                  shouldPromptExtend
                    ? "Boost ending soon"
                    : "Increase visibility"
                }
                message={
                  shouldPromptExtend
                    ? "Extend this sponsored job to keep it prominent in the feed."
                    : "This active job has low visibility. Sponsoring it can help more applicants see it."
                }
                action={
                  <AppButton
                    title={
                      shouldPromptExtend ? "Extend Boost" : "Boost Visibility"
                    }
                    onPress={() => sponsorJob(item)}
                    variant="secondary"
                  />
                }
              />
            ) : null}

            <View style={actionRowStyle}>
              {item.status === "expired" ? (
                <AppButton
                  title="Renew"
                  onPress={() => renewJob(item)}
                  variant="primary"
                  size="sm"
                  fullWidth={false}
                  disabled={isBusy}
                />
              ) : null}

              {item.status === "pending_payment" ? (
                <AppButton
                  title="Complete Payment"
                  onPress={() => continuePayment(item)}
                  variant="primary"
                  size="sm"
                  fullWidth={false}
                  disabled={isBusy}
                />
              ) : null}

              {item.status === "active" ? (
                <>
                  <AppButton
                    title="Close"
                    onPress={() => confirmClose(item)}
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    disabled={isBusy}
                    loading={isBusy}
                  />
                  <AppButton
                    title="Sponsor"
                    onPress={() => sponsorJob(item)}
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    disabled={isBusy}
                  />
                </>
              ) : null}

              {item.status === "draft" ? (
                <>
                  <AppButton
                    title="Edit Draft"
                    onPress={() => editDraft(item)}
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    disabled={isBusy}
                  />
                  <AppButton
                    title="Delete"
                    onPress={() =>
                      Alert.alert(
                        "Delete draft?",
                        "This draft will be removed.",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => {
                              void deleteDraft(item);
                            },
                          },
                        ],
                      )
                    }
                    variant="destructive"
                    size="sm"
                    fullWidth={false}
                    disabled={isBusy}
                    loading={isBusy}
                  />
                </>
              ) : null}
            </View>
          </View>
        </AppCard>
      </View>
    );
  };

  const bulkRenewAvailable = typeof navigation.navigate === "function";

  const headerComponent = (
    <View style={headerBlockStyle}>
      <AppCard variant="elevated" padding="lg">
        <View style={heroWrapStyle}>
          <StatusBadge label="Overview" tone="info" />
          <AppText variant="h3">My Jobs</AppText>
          <AppText variant="bodySm" tone="secondary">
            Track performance, renew expired posts, and manage your active
            listings.
          </AppText>
        </View>
      </AppCard>

      <View style={statsGridStyle}>
        <QuickStat label="Active" value={activeCount} />
        <QuickStat label="Total" value={totalCount} />
      </View>

      {error ? <InlineAlert tone="error" message={error} /> : null}

      {expiredCount >= 2 ? (
        <InlineAlert
          tone="warning"
          title="Several jobs have expired"
          message={`You have ${expiredCount} expired jobs ready for renewal.`}
          action={
            bulkRenewAvailable ? (
              <AppButton
                title={`Renew All Expired (${expiredCount})`}
                onPress={() =>
                  navigation.navigate(
                    "BulkRenew" as never,
                    {
                      jobIds: groups.expired.map((j) => j.id),
                    } as never,
                  )
                }
                variant="secondary"
              />
            ) : undefined
          }
        />
      ) : null}

      {pendingCount > 0 ? (
        <InlineAlert
          tone="info"
          title="Payments need attention"
          message={`${pendingCount} job${pendingCount > 1 ? "s" : ""} ${pendingCount > 1 ? "are" : "is"} still waiting for payment completion.`}
        />
      ) : null}

      {draftCount > 0 ? (
        <InlineAlert
          tone="info"
          title="Drafts available"
          message={`${draftCount} draft job${draftCount > 1 ? "s are" : " is"} waiting to be completed.`}
        />
      ) : null}

      <AppButton
        title="Post Job"
        onPress={() => navigation.navigate("PostJobFlow")}
        variant="primary"
      />
    </View>
  );

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <FlatList
        data={ordered}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        initialNumToRender={8}
        windowSize={5}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={listContentStyle}
        ListHeaderComponent={headerComponent}
      />
    </AppScreen>
  );
}
