import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import type { JobWithCoords } from "../../jobs/jobs.types";

import JobCardHeader from "./JobCardHeader";
import JobCardMeta from "./JobCardMeta";
import JobCardTrustBadges from "./JobCardTrustBadges";
import JobCardActions from "./JobCardActions";
import JobCardApplyModal from "./JobCardApplyModal";

import { useSavedJob } from "@hooks/useSavedJob";
import { useApplyJob } from "@hooks/useApplyJob";

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
  const { saved, toggleSave } = useSavedJob(job.id);

  const {
    applyOpen,
    setApplyOpen,
    applied,
    submitting,
    name,
    setName,
    phoneInput,
    setPhoneInput,
    submitApplication,
  } = useApplyJob(job);

  const isSponsoredActive =
    highlightSponsored &&
    job.is_sponsored &&
    job.sponsored_until &&
    new Date(job.sponsored_until) > new Date();

  return (
    <View
      style={[
        styles.card,
        isPremium && styles.premiumCard,
        isSponsoredActive && styles.sponsoredCard,
      ]}
    >
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

      <JobCardApplyModal
        visible={applyOpen}
        onClose={() => setApplyOpen(false)}
        submitting={submitting}
        name={name}
        setName={setName}
        phoneInput={phoneInput}
        setPhoneInput={setPhoneInput}
        onSubmit={submitApplication}
      />
    </View>
  );
}

export default memo(JobCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  /* Subtle premium surface lift */
  premiumCard: {
    backgroundColor: "#FCFCFF",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },

  /* Sponsored overrides premium */
  sponsoredCard: {
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
});
