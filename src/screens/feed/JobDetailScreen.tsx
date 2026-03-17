import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Alert, Share, View, type ViewStyle } from "react-native";
import * as Linking from "expo-linking";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../core/supabase";
import { Job } from "../../jobs/jobs.types";
import { useSession } from "../../state/useSession";
import { setPendingIntent } from "../../intent/intent.store";
import { getDeviceHash } from "../../security/device";
import { ENV } from "../../core/config";

import type { FeedStackParamList } from "../../navigation/FeedNavigator";
import type { RootStackParamList } from "../../navigation/RootNavigator";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { EmptyState } from "../../ui/EmptyState";
import { InlineAlert } from "../../ui/InlineAlert";
import { SkeletonCard, SkeletonLine } from "../../ui/Skeleton";
import { StatusBadge } from "../../ui/StatusBadge";

type RouteProps = RouteProp<FeedStackParamList, "JobDetail">;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

function sanitize(text?: string | null, max = 400) {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ").slice(0, max);
}

function normalizeUgPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("256")) return "+" + digits;
  if (digits.startsWith("0")) return "+256" + digits.slice(1);
  if (digits.startsWith("7")) return "+256" + digits;
  return "+" + digits;
}

function formatPayType(value?: string | null) {
  if (!value) return "Not specified";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatContactMethod(value: string) {
  if (value === "in_app") return "In app";
  if (value === "walk_in") return "Walk-in";
  if (value === "call") return "Call";
  if (value === "whatsapp") return "WhatsApp";
  return value;
}

function buildShareText(job: Job) {
  const expires = job.expires_at
    ? new Date(job.expires_at).toLocaleDateString("en-UG")
    : "Not specified";

  const contactLine =
    job.contact_method === "walk_in"
      ? "Apply: Walk-in"
      : job.contact_method === "in_app"
        ? "Apply: In app"
        : `Contact: ${job.contact_method.toUpperCase()} • ${job.contact_phone ?? "Not provided"}`;

  const description = sanitize(job.description, 500);
  const details = description ? `\n\nDetails:\n${description}` : "";
  const url = `${ENV.WEB_BASE_URL}/job/${job.id}`;

  return (
    `Job Opportunity — AwoJobs\n\n` +
    `${sanitize(job.title, 120)}\n` +
    `Pay: ${formatPayType(job.pay_type)}\n` +
    `${contactLine}\n` +
    `Expires: ${expires}` +
    `${details}\n\n` +
    `View: ${url}`
  );
}

function hasFullJobDetails(job: Partial<Job> | null): job is Job {
  return (
    !!job &&
    typeof job.id === "string" &&
    typeof job.title === "string" &&
    typeof job.pay_type === "string" &&
    typeof job.contact_method === "string" &&
    "expires_at" in job
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Ionicons name={icon} size={16} color={theme.colors.textTertiary} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="caption" tone="tertiary" uppercase>
          {label}
        </AppText>
        <AppText variant="bodySm" weight="700">
          {value}
        </AppText>
      </View>
    </View>
  );
}

export default function JobDetailScreen() {
  const route = useRoute<RouteProps>();
  const rootNavigation = useNavigation<RootNavProp>();
  const { session } = useSession();
  const { theme } = useTheme();

  const { jobId, preview } = route.params;

  const previewJob = hasFullJobDetails(preview as Partial<Job> | null)
    ? (preview as Job)
    : null;

  const [job, setJob] = useState<Job | null>(previewJob);
  const [loading, setLoading] = useState(!previewJob);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const fetchJob = useCallback(async () => {
    setLoading(true);
    setLoadingError(null);

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      setJob(null);
      setLoadingError("Could not load this job right now.");
      setLoading(false);
      return;
    }

    if (!data) {
      setJob(null);
      setLoading(false);
      return;
    }

    setJob(data as Job);
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    if (!previewJob) {
      void fetchJob();
    }
  }, [fetchJob, previewJob]);

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    }),
    [theme.spacing.lg, theme.spacing.xxxl],
  );

  const heroCardStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.md }),
    [theme.spacing.md],
  );

  const statusRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const heroTextStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.sm }),
    [theme.spacing.sm],
  );

  const metaGridStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.md }),
    [theme.spacing.md],
  );

  const sectionCardStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.md }),
    [theme.spacing.md],
  );

  const actionRowStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.sm }),
    [theme.spacing.sm],
  );

  const loaderWrapStyle = useMemo<ViewStyle>(
    () => ({ gap: theme.spacing.md }),
    [theme.spacing.md],
  );

  const timing = useMemo(() => {
    if (!job) {
      return {
        hasExpiry: false,
        isExpired: false,
        isToday: false,
        expiresLabel: null as string | null,
      };
    }

    const now = Date.now();
    const expiresAt = job.expires_at ? new Date(job.expires_at).getTime() : NaN;
    const hasExpiry = !Number.isNaN(expiresAt);
    const isExpired = hasExpiry ? expiresAt <= now : false;
    const isToday =
      hasExpiry &&
      new Date(expiresAt).toDateString() === new Date(now).toDateString();

    return {
      hasExpiry,
      isExpired,
      isToday,
      expiresLabel: hasExpiry
        ? new Date(expiresAt).toLocaleDateString("en-UG")
        : null,
    };
  }, [job]);

  const shareJob = useCallback(async () => {
    if (!job) return;

    try {
      await Share.share({
        message: buildShareText(job),
        title: "AwoJobs",
      });
    } catch {
      Alert.alert("Unable to share", "Please try again.");
    }
  }, [job]);

  const applyInApp = useCallback(async () => {
    if (!job) return;

    if (timing.isExpired) {
      Alert.alert("Job expired", "Applications are closed for this listing.");
      return;
    }

    if (!session) {
      setPendingIntent({
        type: "APPLY_JOB",
        jobId: job.id,
      });

      rootNavigation.navigate("AuthModal", {
        screen: "Login",
      });
      return;
    }

    if (applying) return;
    setApplying(true);

    try {
      const deviceHash = await getDeviceHash();

      const { error } = await supabase.functions.invoke("apply_job", {
        body: {
          job_id: job.id,
          device_hash: deviceHash,
        },
      });

      if (error) throw error;

      Alert.alert(
        "Application sent",
        "The employer will contact you if shortlisted.",
      );
    } catch (e: any) {
      Alert.alert("Unable to apply", e?.message ?? "Please try again later.");
    } finally {
      setApplying(false);
    }
  }, [applying, job, rootNavigation, session, timing.isExpired]);

  const contactEmployer = useCallback(async () => {
    if (!job) return;

    if (timing.isExpired) {
      Alert.alert(
        "Job expired",
        "Contact actions are closed for this listing.",
      );
      return;
    }

    try {
      if (job.contact_method === "call") {
        if (!job.contact_phone) {
          Alert.alert("Contact unavailable", "Phone number is not available.");
          return;
        }

        const url = `tel:${normalizeUgPhone(job.contact_phone)}`;
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
          Alert.alert(
            "Unavailable",
            "Calling is not available on this device.",
          );
          return;
        }

        await Linking.openURL(url);
        return;
      }

      if (job.contact_method === "whatsapp") {
        if (!job.contact_phone) {
          Alert.alert(
            "Contact unavailable",
            "WhatsApp number is not available.",
          );
          return;
        }

        const phone = normalizeUgPhone(job.contact_phone).replace("+", "");
        const msg = encodeURIComponent(
          `Hello, I saw your job "${job.title}" on AwoJobs. Is it still available?`,
        );
        const url = `https://wa.me/${phone}?text=${msg}`;
        const supported = await Linking.canOpenURL(url);

        if (!supported) {
          Alert.alert(
            "Unavailable",
            "WhatsApp is not available on this device.",
          );
          return;
        }

        await Linking.openURL(url);
        return;
      }

      if (job.contact_method === "walk_in") {
        Alert.alert("Walk-in job", "Visit the employer in person.");
      }
    } catch {
      Alert.alert("Unable to open contact", "Please try again.");
    }
  }, [job, timing.isExpired]);

  const primaryAction = useMemo(() => {
    if (!job) {
      return {
        label: "Unavailable",
        onPress: undefined as (() => void) | undefined,
      };
    }

    if (timing.isExpired) {
      return {
        label: "Job expired",
        onPress: undefined as (() => void) | undefined,
      };
    }

    if (job.contact_method === "in_app") {
      return {
        label: applying ? "Applying..." : "Apply in app",
        onPress: applyInApp,
      };
    }

    return {
      label: "Contact employer",
      onPress: contactEmployer,
    };
  }, [applying, applyInApp, contactEmployer, job, timing.isExpired]);

  if (loading) {
    return (
      <AppScreen scroll>
        <View style={loaderWrapStyle}>
          <AppHeader title="Job Details" />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={5} />
          <View style={{ gap: theme.spacing.sm }}>
            <SkeletonLine height={52} radius={theme.radius.md} />
            <SkeletonLine height={52} radius={theme.radius.md} />
          </View>
        </View>
      </AppScreen>
    );
  }

  if (loadingError) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Could not load job"
          message={loadingError}
          action={
            <AppButton title="Try Again" onPress={fetchJob} variant="primary" />
          }
        />
      </AppScreen>
    );
  }

  if (!job) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Job unavailable"
          message="This job may have expired, been removed, or is no longer accessible."
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={contentStyle}>
        <AppHeader title="Job Details" />

        <AppCard
          variant={job.is_sponsored ? "sponsored" : "elevated"}
          padding="lg"
        >
          <View style={heroCardStyle}>
            <View style={statusRowStyle}>
              {job.is_sponsored ? (
                <StatusBadge label="Sponsored" tone="sponsored" />
              ) : null}

              {timing.isToday ? (
                <StatusBadge label="Today" tone="warning" />
              ) : null}

              {timing.isExpired ? (
                <StatusBadge label="Expired" tone="error" />
              ) : null}
            </View>

            <View style={heroTextStyle}>
              <AppText variant="h2">{sanitize(job.title, 150)}</AppText>

              <View style={metaGridStyle}>
                <MetaRow
                  icon="wallet-outline"
                  label="Pay Type"
                  value={formatPayType(job.pay_type)}
                />

                {timing.expiresLabel ? (
                  <MetaRow
                    icon="time-outline"
                    label="Expires"
                    value={timing.expiresLabel}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </AppCard>

        {timing.isExpired ? (
          <InlineAlert
            tone="error"
            title="This job has expired"
            message="Applications and employer contact actions are no longer available for this listing."
          />
        ) : job.contact_method === "in_app" ? (
          <InlineAlert
            tone="info"
            title="Apply through AwoJobs"
            message={
              session
                ? "Submit your application securely inside the app."
                : "Sign in first to apply and continue your job activity."
            }
          />
        ) : null}

        {job.description ? (
          <AppCard variant="default" padding="lg">
            <View style={sectionCardStyle}>
              <AppText variant="titleLg">Job description</AppText>
              <AppText variant="body">
                {sanitize(job.description, 5000)}
              </AppText>
            </View>
          </AppCard>
        ) : null}

        <AppCard variant="default" padding="lg">
          <View style={sectionCardStyle}>
            <AppText variant="titleLg">Application details</AppText>

            <MetaRow
              icon="briefcase-outline"
              label="Method"
              value={formatContactMethod(job.contact_method)}
            />

            {job.contact_phone ? (
              <MetaRow
                icon="call-outline"
                label="Contact"
                value={job.contact_phone}
              />
            ) : null}
          </View>
        </AppCard>

        <View style={actionRowStyle}>
          <AppButton
            title={primaryAction.label}
            onPress={primaryAction.onPress}
            disabled={timing.isExpired || applying || !primaryAction.onPress}
            loading={job.contact_method === "in_app" && applying}
            variant="primary"
          />

          <AppButton title="Share job" onPress={shareJob} variant="secondary" />
        </View>
      </View>
    </AppScreen>
  );
}
