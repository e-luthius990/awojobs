import React, { useMemo } from "react";
import { View, type ViewStyle } from "react-native";
import type { JobWithCoords } from "../../jobs/jobs.types";

import { useTheme } from "../../../theme/useTheme";
import { StatusBadge, type StatusBadgeTone } from "../../StatusBadge";

type TrustBadge = {
  key: string;
  label: string;
  tone: StatusBadgeTone;
};

function getCreatedAtTimestamp(
  value: string | null | undefined,
): number | null {
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getTrustBadges(job: JobWithCoords): TrustBadge[] {
  const badges: TrustBadge[] = [];
  const createdAt = getCreatedAtTimestamp(job.created_at);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  if (job.employer_verified === true) {
    badges.push({
      key: "verified",
      label: "Verified employer",
      tone: "verified",
    });
  }

  if (createdAt !== null && createdAt >= sevenDaysAgo) {
    badges.push({
      key: "new",
      label: "New post",
      tone: "info",
    });
  }

  return badges;
}

export default function JobCardTrustBadges({ job }: { job: JobWithCoords }) {
  const { theme } = useTheme();

  const trustBadges = useMemo(
    () => getTrustBadges(job),
    [job.created_at, job.employer_verified],
  );

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  if (!trustBadges.length) return null;

  return (
    <View style={containerStyle}>
      {trustBadges.map((badge) => (
        <StatusBadge key={badge.key} label={badge.label} tone={badge.tone} />
      ))}
    </View>
  );
}
