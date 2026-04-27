import React, { useMemo } from "react";
import { View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { JobWithCoords } from "../../jobs/jobs.types";

import { useTheme } from "../../../theme/useTheme";
import { AppText } from "../../AppText";
import { StatusBadge } from "../../StatusBadge";

type Props = {
  job: JobWithCoords;
  showLocation?: boolean;
  compact?: boolean;
};

function formatPayType(value: string | null | undefined) {
  if (!value || value === "not_specified") return "Pay not specified";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseSafeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortDate(date: Date | null): string | null {
  if (!date) return null;

  return new Intl.DateTimeFormat("en-UG", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export default function JobCardMeta({
  job,
  showLocation = true,
  compact = false,
}: Props) {
  const { theme } = useTheme();

  const expiresDate = useMemo(
    () => parseSafeDate(job.expires_at),
    [job.expires_at],
  );

  const locationLabel = useMemo(() => {
    if (!showLocation) return null;

    if (
      typeof job.posting_display_label === "string" &&
      job.posting_display_label.trim().length > 0
    ) {
      return job.posting_display_label.trim();
    }

    return null;
  }, [job.posting_display_label, showLocation]);

  const payLabel = useMemo(() => formatPayType(job.pay_type), [job.pay_type]);

  const formattedExpiry = useMemo(
    () => formatShortDate(expiresDate),
    [expiresDate],
  );

  const isDistrictFallback = job.posting_resolution_level === "district_only";

  const metaLine = useMemo(() => {
    const parts: string[] = [];

    if (locationLabel) parts.push(locationLabel);
    if (payLabel) parts.push(payLabel);
    if (formattedExpiry) parts.push(`Expires ${formattedExpiry}`);

    return parts.join(" • ");
  }, [locationLabel, payLabel, formattedExpiry]);

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      gap: compact ? theme.spacing.xs : theme.spacing.sm,
    }),
    [compact, theme.spacing.sm, theme.spacing.xs],
  );

  const topRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const badgeRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      justifyContent: "flex-end",
    }),
    [theme.spacing.xs],
  );

  const metaRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      minWidth: 0,
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  return (
    <View style={containerStyle}>
      <View style={topRowStyle}>
        <View style={{ flex: 1, minWidth: 0 }} />

        {isDistrictFallback ? (
          <View style={badgeRowStyle}>
            <StatusBadge label="District" tone="warning" />
          </View>
        ) : null}
      </View>

      {metaLine ? (
        <View style={metaRowStyle}>
          <Ionicons
            name="location-outline"
            size={15}
            color={theme.colors.textTertiary}
            style={{ marginTop: 2 }}
          />
          <AppText
            variant={compact ? "bodySm" : "body"}
            tone="secondary"
            weight="600"
            style={{ flex: 1, lineHeight: compact ? 20 : 22 }}
          >
            {metaLine}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
