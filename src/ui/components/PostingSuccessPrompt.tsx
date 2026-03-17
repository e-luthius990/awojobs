import React, { useCallback, useMemo } from "react";
import { Alert, Share, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Job } from "../../jobs/jobs.types";
import { normalizeUgPhone } from "@utils/normalizeUgPhone";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { AppText } from "../../ui/AppText";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";

const APP_URL = "https://awojobs.app";

function parseExpiry(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatPayType(value: string | null | undefined) {
  if (!value) return "Not specified";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatExpiryDate(value: string | null | undefined) {
  const timestamp = parseExpiry(value);
  if (timestamp === null) return "Not specified";

  return new Intl.DateTimeFormat("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

/* ---------------------------------------------
   SHARE TEXT
---------------------------------------------- */
function buildShareText(job: Job) {
  const expiresAt = formatExpiryDate(job.expires_at);
  const payLabel = formatPayType(job.pay_type);

  let contact = "Apply via AwoJobs";

  if (job.contact_method === "walk_in") {
    contact = "Apply: Walk in";
  }

  if (job.contact_phone) {
    const normalized = normalizeUgPhone(job.contact_phone);
    const validUg = /^\+2567\d{8}$/.test(normalized);

    if (validUg) {
      contact = `Contact: ${normalized}`;
    }
  }

  return (
    `JOB AVAILABLE\n\n` +
    `${job.title}\n` +
    `Pay: ${payLabel}\n` +
    `${contact}\n` +
    `Expires: ${expiresAt}\n\n` +
    `View job:\n${APP_URL}/job/${job.id}`
  );
}

export function PostingSuccessPrompt({
  job,
  onDone,
}: {
  job: Job;
  onDone(): void;
}) {
  const { theme } = useTheme();

  const expiryTimestamp = useMemo(
    () => parseExpiry(job.expires_at),
    [job.expires_at],
  );
  const expired = expiryTimestamp === null || expiryTimestamp < Date.now();

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      width: "100%",
      gap: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const cardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const heroStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const iconWrapStyle = useMemo<ViewStyle>(
    () => ({
      width: 56,
      height: 56,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.successSoft,
      borderWidth: 1,
      borderColor: theme.colors.verifiedBorder,
    }),
    [theme.colors.successSoft, theme.colors.verifiedBorder, theme.radius.pill],
  );

  const textBlockStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const summaryBoxStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.bgSurfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    }),
    [
      theme.colors.bgSurfaceMuted,
      theme.colors.borderMuted,
      theme.radius.xl,
      theme.spacing.md,
      theme.spacing.xs,
    ],
  );

  const actionsStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const shareJob = useCallback(async () => {
    try {
      await Share.share({
        message: buildShareText(job),
      });
    } catch {
      Alert.alert("Could not share", "Please try again.");
    }
  }, [job]);

  return (
    <AppScreen centerContent>
      <View style={contentStyle}>
        <AppCard variant="elevated" padding="lg">
          <View style={cardContentStyle}>
            <View style={heroStyle}>
              <View style={iconWrapStyle}>
                <Ionicons
                  name="checkmark"
                  size={24}
                  color={theme.colors.success}
                />
              </View>

              <View style={textBlockStyle}>
                <StatusBadge label="Success" tone="success" />

                <AppText variant="h2" align="center">
                  Job posted successfully
                </AppText>

                <AppText variant="bodySm" tone="secondary" align="center">
                  Your job is now live and ready for candidate discovery on
                  AwoJobs.
                </AppText>
              </View>
            </View>

            <View style={summaryBoxStyle}>
              <AppText variant="labelLg" weight="700">
                {job.title}
              </AppText>

              <AppText variant="bodySm" tone="secondary">
                {expired
                  ? "This listing has already expired, so sharing is unavailable."
                  : "Share this listing to improve visibility and help more candidates discover it quickly."}
              </AppText>
            </View>

            {!expired ? (
              <InlineAlert
                tone="info"
                title="Reach more candidates"
                message="Sharing this job link can improve visibility and increase candidate discovery."
              />
            ) : (
              <InlineAlert
                tone="warning"
                title="Job expired"
                message="This listing has already expired, so sharing is unavailable."
              />
            )}

            <View style={actionsStyle}>
              {!expired ? (
                <AppButton
                  title="Share Job"
                  onPress={shareJob}
                  variant="primary"
                />
              ) : null}

              <AppButton
                title="Done"
                onPress={onDone}
                variant={!expired ? "secondary" : "primary"}
              />
            </View>
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}
