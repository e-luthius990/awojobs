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

function getTrustBadges(job: JobWithCoords): TrustBadge[] {
  const badges: TrustBadge[] = [];

  if (job.employer_verified === true) {
    badges.push({
      key: "verified",
      label: "Verified employer",
      tone: "verified",
    });
  }

  return badges;
}

export default function JobCardTrustBadges({ job }: { job: JobWithCoords }) {
  const { theme } = useTheme();

  const trustBadges = useMemo(
    () => getTrustBadges(job),
    [job.employer_verified],
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
