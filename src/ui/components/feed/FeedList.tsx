import React, { memo, useMemo } from "react";
import { View, type ViewStyle } from "react-native";

import JobCard from "../job-card/JobCard";
import type { JobWithCoords } from "@jobs/jobs.types";
import { useTheme } from "../../../theme/useTheme";

type Props = {
  item: JobWithCoords;
  isPremium: boolean;
  onShareJob?: (job: JobWithCoords) => void;
  onViewApplication?: (job: JobWithCoords) => void;
};

function FeedListComponent({
  item,
  isPremium,
  onShareJob,
  onViewApplication,
}: Props) {
  const { theme } = useTheme();

  const baseStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  return (
    <View style={baseStyle}>
      <JobCard
        job={item}
        showLocation
        highlightSponsored={item.is_currently_sponsored}
        isPremium={isPremium}
        onShareJob={onShareJob}
        onViewApplication={onViewApplication}
      />
    </View>
  );
}

export default memo(FeedListComponent);
