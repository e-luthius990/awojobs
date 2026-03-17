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
};

function formatPayType(value: string | null | undefined) {
  if (!value) return "Not specified";

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
    year: "numeric",
  }).format(date);
}

export default function JobCardMeta({ job, showLocation = true }: Props) {
  const { theme } = useTheme();

  const createdDate = useMemo(
    () => parseSafeDate(job.created_at),
    [job.created_at],
  );
  const expiresDate = useMemo(
    () => parseSafeDate(job.expires_at),
    [job.expires_at],
  );

  const isToday = useMemo(() => {
    if (!createdDate) return false;

    const now = new Date();
    return createdDate.toDateString() === now.toDateString();
  }, [createdDate]);

  const locationLabel = useMemo(() => {
    if (!showLocation) return null;
    if (!job.sub_county || !job.district) return null;

    return `${job.sub_county}, ${job.district}`;
  }, [job.sub_county, job.district, showLocation]);

  const formattedExpiry = useMemo(
    () => formatShortDate(expiresDate),
    [expiresDate],
  );
  const payLabel = useMemo(() => formatPayType(job.pay_type), [job.pay_type]);

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const topMetaRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const locationWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const payRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const expiryRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  return (
    <View style={containerStyle}>
      <View style={topMetaRowStyle}>
        {locationLabel ? (
          <View style={locationWrapStyle}>
            <Ionicons
              name="location-outline"
              size={15}
              color={theme.colors.textTertiary}
            />
            <AppText
              variant="bodySm"
              tone="secondary"
              weight="600"
              numberOfLines={1}
            >
              {locationLabel}
            </AppText>
          </View>
        ) : (
          <View style={{ flex: 1, minWidth: 0 }} />
        )}

        {isToday ? <StatusBadge label="Today" tone="warning" /> : null}
      </View>

      <View style={payRowStyle}>
        <AppText variant="caption" tone="tertiary" uppercase>
          Pay Type
        </AppText>
        <AppText variant="bodySm" tone="primary" weight="700">
          {payLabel}
        </AppText>
      </View>

      {formattedExpiry ? (
        <View style={expiryRowStyle}>
          <AppText variant="caption" tone="tertiary">
            Expires
          </AppText>
          <AppText variant="caption" tone="secondary" weight="600">
            {formattedExpiry}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
