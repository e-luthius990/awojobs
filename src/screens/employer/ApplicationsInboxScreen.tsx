import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  View,
  Pressable,
  type ListRenderItem,
  type ViewStyle,
} from "react-native";
import * as Linking from "expo-linking";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../../core/supabase";
import { useSession } from "../../state/useSession";
import { fetchMyApplications } from "../../jobs/applications.service";
import { Application, ApplicationStatus } from "../../jobs/applications.types";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { EmptyState } from "../../ui/EmptyState";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";
import { SkeletonCard } from "../../ui/Skeleton";

type AppStatusTone = React.ComponentProps<typeof StatusBadge>["tone"];

function mapStatusTone(status: ApplicationStatus): AppStatusTone {
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

function normalizeUgPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) return "";

  if (digits.length === 12 && digits.startsWith("256")) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+256${digits.slice(1)}`;
  }
  if (digits.length === 9 && digits.startsWith("7")) return `+256${digits}`;

  return `+${digits}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Unknown date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleString();
}

function getApplicantName(app: Application) {
  return app.applicant_name?.trim() || "Applicant";
}

function getApplicantPhone(app: Application) {
  return app.applicant_phone?.trim() || null;
}

function getCreatedAt(app: Application) {
  return app.created_at;
}

function getJobTitle(app: Application) {
  return app.job?.title?.trim() || null;
}

function getSource(app: Application) {
  return app.source?.trim() || null;
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

export default function ApplicationsInboxScreen() {
  const { theme } = useTheme();
  const { session } = useSession();

  const userId = session?.user?.id ?? null;

  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
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

  const statsRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const headerBlockStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
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
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const actionRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchMyApplications();
      setApps(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load applications right now.");
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const data = await fetchMyApplications();
      setApps(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not refresh applications right now.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const data = await fetchMyApplications();
      setApps(Array.isArray(data) ? data : []);
    } catch {
      // keep existing UI on silent refresh failure
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`applications-inbox-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `employer_id=eq.${userId}`,
        },
        () => {
          void silentRefresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [silentRefresh, userId]);

  const setUpdating = useCallback((id: string, active: boolean) => {
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      if (active) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: ApplicationStatus) => {
      if (!userId) {
        setError("You must be signed in.");
        return;
      }

      if (updatingIds.has(id)) return;

      try {
        setError(null);
        setUpdating(id, true);

        setApps((prev) =>
          prev.map((app) => (app.id === id ? { ...app, status } : app)),
        );

        const { error: updateError } = await supabase
          .from("applications")
          .update({ status })
          .eq("id", id)
          .eq("employer_id", userId);

        if (updateError) {
          throw updateError;
        }

        await silentRefresh();
      } catch {
        setError("Could not update application status.");
        await silentRefresh();
      } finally {
        setUpdating(id, false);
      }
    },
    [setUpdating, silentRefresh, updatingIds, userId],
  );

  const call = useCallback(async (phone?: string | null) => {
    if (!phone) {
      setError("Phone number is not available.");
      return;
    }

    try {
      const normalized = normalizeUgPhone(phone);
      if (!normalized) {
        setError("Phone number is not valid.");
        return;
      }

      const url = `tel:${normalized}`;
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        setError("Calling is not available on this device.");
        return;
      }

      await Linking.openURL(url);
    } catch {
      setError("Could not start the call.");
    }
  }, []);

  const whatsapp = useCallback(async (phone?: string | null, name?: string) => {
    if (!phone || !name) {
      setError("WhatsApp contact is not available.");
      return;
    }

    try {
      const normalized = normalizeUgPhone(phone).replace("+", "");
      if (!normalized) {
        setError("Phone number is not valid.");
        return;
      }

      const msg = encodeURIComponent(
        `Hello ${name}, thank you for applying via AwoJobs.`,
      );
      const url = `https://wa.me/${normalized}?text=${msg}`;
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        setError("WhatsApp is not available on this device.");
        return;
      }

      await Linking.openURL(url);
    } catch {
      setError("Could not open WhatsApp.");
    }
  }, []);

  const pendingCount = useMemo(
    () => apps.filter((app) => app.status === "pending").length,
    [apps],
  );

  const reviewedCount = useMemo(
    () => apps.filter((app) => app.status === "reviewed").length,
    [apps],
  );

  const newCount = useMemo(
    () => apps.filter((app) => app.status === "pending").length,
    [apps],
  );

  const renderItem: ListRenderItem<Application> = useCallback(
    ({ item }) => {
      const applicantName = getApplicantName(item);
      const applicantPhone = getApplicantPhone(item);
      const jobTitle = getJobTitle(item);
      const source = getSource(item);
      const createdAt = getCreatedAt(item);
      const pending = item.status === "pending";
      const busy = updatingIds.has(item.id);
      const fresh = item.status === "pending";

      return (
        <AppCard variant="elevated" padding="lg">
          <View style={cardContentStyle}>
            <View style={topRowStyle}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="title">{applicantName}</AppText>

                {jobTitle ? (
                  <AppText variant="bodySm" tone="secondary">
                    {jobTitle}
                  </AppText>
                ) : null}

                <AppText variant="caption" tone="secondary">
                  Applied {formatDateTime(createdAt)}
                </AppText>
              </View>

              <View style={{ alignItems: "flex-end", gap: 8 }}>
                {fresh ? <StatusBadge label="New" tone="success" /> : null}
                <StatusBadge
                  label={formatStatus(item.status)}
                  tone={mapStatusTone(item.status)}
                />
              </View>
            </View>

            {applicantPhone ? (
              <AppText variant="bodySm">{applicantPhone}</AppText>
            ) : (
              <AppText variant="bodySm" tone="secondary">
                No phone number available
              </AppText>
            )}

            {source ? (
              <AppText variant="caption" tone="secondary">
                Source: {source}
              </AppText>
            ) : null}

            <View style={actionRowStyle}>
              <AppButton
                title="Call"
                variant="secondary"
                onPress={() => {
                  void call(applicantPhone);
                }}
              />

              <AppButton
                title="WhatsApp"
                variant="secondary"
                onPress={() => {
                  void whatsapp(applicantPhone, applicantName);
                }}
              />

              {item.status !== "reviewed" ? (
                <AppButton
                  title={busy ? "Updating..." : "Review"}
                  variant="secondary"
                  disabled={busy}
                  onPress={() => {
                    void updateStatus(item.id, "reviewed");
                  }}
                />
              ) : null}

              {item.status !== "shortlisted" ? (
                <AppButton
                  title={busy ? "Updating..." : "Shortlist"}
                  variant="secondary"
                  disabled={busy}
                  onPress={() => {
                    void updateStatus(item.id, "shortlisted");
                  }}
                />
              ) : null}

              {item.status !== "rejected" ? (
                <AppButton
                  title={busy ? "Updating..." : "Reject"}
                  variant="secondary"
                  disabled={busy}
                  onPress={() => {
                    void updateStatus(item.id, "rejected");
                  }}
                />
              ) : null}

              {pending ||
              item.status === "reviewed" ||
              item.status === "shortlisted" ? (
                <AppButton
                  title={busy ? "Updating..." : "Hire"}
                  variant="primary"
                  disabled={busy}
                  onPress={() => {
                    void updateStatus(item.id, "hired");
                  }}
                />
              ) : null}
            </View>
          </View>
        </AppCard>
      );
    },
    [
      actionRowStyle,
      call,
      cardContentStyle,
      topRowStyle,
      updateStatus,
      updatingIds,
      whatsapp,
    ],
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
      <FlatList
        data={apps}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
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
          <View style={headerBlockStyle}>
            <AppHeader
              title="Applications"
              subtitle="Review and manage incoming candidates."
            />

            <View style={statsRowStyle}>
              <QuickStat label="Total" value={apps.length} />
              <QuickStat label="Pending" value={pendingCount} />
              <QuickStat label="Reviewed" value={reviewedCount} />
            </View>

            {newCount > 0 ? (
              <InlineAlert
                tone="success"
                title={`${newCount} new application${newCount > 1 ? "s" : ""}`}
                message="New applications are candidates still in pending status."
              />
            ) : null}

            {error ? <InlineAlert tone="warning" message={error} /> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No applications yet"
            message="Applications from your job posts will appear here."
          />
        }
      />
    </AppScreen>
  );
}
