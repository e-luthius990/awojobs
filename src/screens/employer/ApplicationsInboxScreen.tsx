import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  FlatList,
  RefreshControl,
  View,
  Pressable,
  type ViewStyle,
} from "react-native";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../core/supabase";
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

/* --------------------------------------------- */
const NEW_WINDOW_HOURS = 24;
const VIEWED_STORAGE_KEY = "employer_viewed_applications";
/* --------------------------------------------- */

function isNew(createdAt: string, viewedIds: Set<string>, id: string) {
  if (viewedIds.has(id)) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < NEW_WINDOW_HOURS * 60 * 60 * 1000;
}

function normalizeUgPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("256")) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+256${digits.slice(1)}`;
  }
  if (digits.length === 9 && digits.startsWith("7")) return `+256${digits}`;
  return `+${digits}`;
}

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

  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(VIEWED_STORAGE_KEY).then((data) => {
      if (!active || !data) return;

      try {
        setViewedIds(new Set(JSON.parse(data)));
      } catch {
        // ignore malformed local cache
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;

    if (!silent) {
      setLoading(true);
    }

    setError(null);

    try {
      const data = await fetchMyApplications();
      setApps(data);
    } catch {
      setError("Could not load applications right now.");
      setApps([]);
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
      .channel("applications-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        () => {
          void load({ silent: true });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const totalCount = apps.length;

  const newCount = useMemo(
    () => apps.filter((a) => isNew(a.created_at, viewedIds, a.id)).length,
    [apps, viewedIds],
  );

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
      if (updatingIds.has(id)) return;

      try {
        setUpdating(id, true);

        const { error } = await supabase
          .from("applications")
          .update({ status })
          .eq("id", id);

        if (error) throw error;

        setApps((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a)),
        );
      } catch {
        setError("Could not update application status.");
      } finally {
        setUpdating(id, false);
      }
    },
    [setUpdating, updatingIds],
  );

  const markViewed = useCallback(
    async (id: string) => {
      if (viewedIds.has(id)) return;

      const updated = new Set(viewedIds);
      updated.add(id);
      setViewedIds(updated);

      try {
        await AsyncStorage.setItem(
          VIEWED_STORAGE_KEY,
          JSON.stringify(Array.from(updated)),
        );
      } catch {
        // ignore local persistence failure
      }
    },
    [viewedIds],
  );

  const call = useCallback(async (phone?: string | null) => {
    if (!phone) {
      setError("Phone number is not available.");
      return;
    }

    try {
      const url = `tel:${normalizeUgPhone(phone)}`;
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
      const msg = encodeURIComponent(
        `Hello ${name}, thank you for applying via AwoJobs.`,
      );
      const url = `https://wa.me/${normalizeUgPhone(phone).replace("+", "")}?text=${msg}`;
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

  const headerContentStyle = useMemo<ViewStyle>(
    () => ({
      paddingHorizontal: theme.spacing.screenX,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.lg,
    }),
    [theme.spacing.lg, theme.spacing.md, theme.spacing.screenX],
  );

  const summaryRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const listContentStyle = useMemo<ViewStyle>(
    () => ({
      paddingBottom: theme.spacing.xxxl,
      paddingTop: theme.spacing.md,
    }),
    [theme.spacing.md, theme.spacing.xxxl],
  );

  const itemWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.screenX,
    }),
    [theme.spacing.screenX, theme.spacing.sm],
  );

  const cardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
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

  const leftColStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const rightColStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "flex-end",
      gap: 6,
    }),
    [],
  );

  const nameRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flexWrap: "wrap",
    }),
    [theme.spacing.xs],
  );

  const primaryActionRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const secondaryActionRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
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
          <AppHeader title="Applications Inbox" />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      </AppScreen>
    );
  }

  if (error && apps.length === 0) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Could not load applications"
          message={error}
          action={
            <AppButton
              title="Try Again"
              onPress={() => void load()}
              variant="primary"
            />
          }
        />
      </AppScreen>
    );
  }

  if (!apps.length) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="No applications yet"
          message="When candidates apply to your jobs, they will appear here."
        />
      </AppScreen>
    );
  }

  const header = (
    <View style={headerContentStyle}>
      <AppHeader
        title="Applications"
        subtitle="Review candidates and update their status"
      />

      <View style={summaryRowStyle}>
        <QuickStat label="Total" value={totalCount} />
        <QuickStat label="New" value={newCount} />
      </View>

      {newCount > 0 ? (
        <InlineAlert
          tone="info"
          title={`${newCount} new application${newCount > 1 ? "s" : ""}`}
          message="Review new candidates and update their status."
        />
      ) : null}

      {error ? <InlineAlert tone="error" message={error} /> : null}
    </View>
  );

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <FlatList
        data={apps}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        contentContainerStyle={listContentStyle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load({ silent: true });
            }}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => {
          const showNew = isNew(item.created_at, viewedIds, item.id);
          const isUpdatingThis = updatingIds.has(item.id);

          return (
            <View style={itemWrapStyle}>
              <Pressable
                onPress={() => void markViewed(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Open application from ${item.applicant_name}`}
                style={({ pressed }) => [{ opacity: pressed ? 0.985 : 1 }]}
              >
                <AppCard variant="elevated" padding="lg">
                  <View style={cardContentStyle}>
                    <View style={topRowStyle}>
                      <View style={leftColStyle}>
                        <View style={nameRowStyle}>
                          <AppText variant="title">
                            {item.applicant_name}
                          </AppText>
                          {showNew ? (
                            <StatusBadge label="New" tone="info" />
                          ) : null}
                        </View>

                        <AppText variant="bodySm" tone="secondary">
                          Applied for: {item.job.title}
                        </AppText>
                      </View>

                      <View style={rightColStyle}>
                        <StatusBadge
                          label={formatStatus(item.status)}
                          tone={mapStatusTone(item.status)}
                        />
                        <AppText variant="caption" tone="tertiary">
                          {new Date(item.created_at).toLocaleDateString()}
                        </AppText>
                      </View>
                    </View>

                    <View style={primaryActionRowStyle}>
                      <AppButton
                        title="Shortlist"
                        variant="secondary"
                        size="sm"
                        fullWidth={false}
                        onPress={() => updateStatus(item.id, "shortlisted")}
                        disabled={
                          item.status === "shortlisted" || isUpdatingThis
                        }
                        loading={isUpdatingThis}
                      />

                      <AppButton
                        title="Hire"
                        variant="primary"
                        size="sm"
                        fullWidth={false}
                        onPress={() => updateStatus(item.id, "hired")}
                        disabled={item.status === "hired" || isUpdatingThis}
                      />

                      <AppButton
                        title="Reject"
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        onPress={() => updateStatus(item.id, "rejected")}
                        disabled={item.status === "rejected" || isUpdatingThis}
                      />
                    </View>

                    <View style={secondaryActionRowStyle}>
                      <AppButton
                        title="Call"
                        variant="secondary"
                        size="sm"
                        fullWidth={false}
                        onPress={() => void call(item.applicant_phone)}
                      />

                      <AppButton
                        title="WhatsApp"
                        variant="primary"
                        size="sm"
                        fullWidth={false}
                        onPress={() =>
                          void whatsapp(
                            item.applicant_phone,
                            item.applicant_name,
                          )
                        }
                      />
                    </View>
                  </View>
                </AppCard>
              </Pressable>
            </View>
          );
        }}
      />
    </AppScreen>
  );
}
