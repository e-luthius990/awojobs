import React, { memo } from "react";
import { View } from "react-native";
import type { JobWithCoords } from "../../jobs/jobs.types";

import JobCardHeader from "./JobCardHeader";
import JobCardMeta from "./JobCardMeta";
import JobCardTrustBadges from "./JobCardTrustBadges";
import JobCardActions from "./JobCardActions";
import JobCardApplyModal from "./JobCardApplyModal";

import { AppCard } from "../../AppCard";
import { useSavedJob } from "@hooks/useSavedJob";
import { useApplyJob } from "@hooks/useApplyJob";
import { useTheme } from "../../../theme/useTheme";

type Props = {
  job: JobWithCoords;
  showLocation?: boolean;
  highlightSponsored?: boolean;
  isPremium?: boolean;
};

function JobCardComponent({
  job,
  showLocation = true,
  highlightSponsored = false,
  isPremium = false,
}: Props) {
  const { theme } = useTheme();
  const { saved, toggleSave } = useSavedJob(job.id);

  const { applyOpen, setApplyOpen, applied, submitting, submitApplication } =
    useApplyJob(job);

  const isSponsoredActive =
    highlightSponsored && Boolean(job.is_currently_sponsored);

  const cardVariant = isSponsoredActive ? "sponsored" : "elevated";

  return (
    <AppCard variant={cardVariant} padding="md">
      <View style={{ gap: theme.spacing.md }}>
        <JobCardHeader
          job={job}
          saved={saved}
          onToggleSave={toggleSave}
          applied={applied}
          isSponsored={isSponsoredActive}
          isPremium={isPremium}
        />

        <JobCardTrustBadges job={job} />

        <JobCardMeta job={job} showLocation={showLocation} />

        <JobCardActions
          job={job}
          applied={applied}
          onApply={() => setApplyOpen(true)}
        />
      </View>

      <JobCardApplyModal
        visible={applyOpen}
        onClose={() => setApplyOpen(false)}
        submitting={submitting}
        onSubmit={submitApplication}
      />
    </AppCard>
  );
}

export default memo(JobCardComponent);
