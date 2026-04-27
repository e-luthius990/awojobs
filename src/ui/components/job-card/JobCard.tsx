import React, { memo, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import type { JobWithCoords } from "../../jobs/jobs.types";

import JobCardHeader from "./JobCardHeader";
import JobCardMeta from "./JobCardMeta";
import JobCardTrustBadges from "./JobCardTrustBadges";
import JobCardActions from "./JobCardActions";
import JobCardApplyModal from "./JobCardApplyModal";

import { AppCard } from "../../AppCard";
import { AppText } from "../../AppText";
import { AppButton } from "../../AppButton";
import { useSavedJob } from "@hooks/useSavedJob";
import { useApplyJob } from "@hooks/useApplyJob";
import { useSession } from "@state/useSession";
import { useProfile } from "@state/useProfile";
import { useTheme } from "../../../theme/useTheme";

type Props = {
  job: JobWithCoords;
  showLocation?: boolean;
  highlightSponsored?: boolean;
  isPremium?: boolean;
  onViewApplication?: (job: JobWithCoords) => void;
  onShareJob?: (job: JobWithCoords) => void;
};

function sanitize(text?: string | null, max = 400) {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ").slice(0, max);
}

function JobCardComponent({
  job,
  showLocation = true,
  highlightSponsored = false,
  isPremium = false,
  onViewApplication,
  onShareJob,
}: Props) {
  const { theme } = useTheme();
  const { user, isAuthenticated } = useSession();
  const { role, loading: profileLoading } = useProfile(user?.id ?? null);

  const canSaveJob =
    isAuthenticated && !profileLoading && role === "job_seeker";

  const { saved, toggleSave } = useSavedJob(job.id);
  const { applyOpen, setApplyOpen, applied, submitting, submitApplication } =
    useApplyJob(job);

  const [expanded, setExpanded] = useState(false);

  const isSponsoredActive =
    highlightSponsored && Boolean(job.is_currently_sponsored);

  const cardVariant = isSponsoredActive ? "sponsored" : "elevated";

  const descriptionPreview = useMemo(() => {
    return sanitize(job.description, 180);
  }, [job.description]);

  const fullDescription = useMemo(() => {
    return sanitize(job.description, 5000);
  }, [job.description]);

  const hasExpandedContent = useMemo(() => {
    return Boolean(job.description || job.contact_phone || onShareJob);
  }, [job.description, job.contact_phone, onShareJob]);

  const isExpired = useMemo(() => {
    if (!job.expires_at) return false;
    const ts = new Date(job.expires_at).getTime();
    if (Number.isNaN(ts)) return false;
    return ts <= Date.now();
  }, [job.expires_at]);

  const dividerColor =
    theme.colors.border?.default ??
    theme.colors.border?.subtle ??
    "rgba(15,23,42,0.08)";

  return (
    <>
      <AppCard variant={cardVariant} padding="md">
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <JobCardHeader
              job={job}
              saved={saved}
              onToggleSave={toggleSave}
              applied={applied}
              isSponsored={isSponsoredActive}
              isPremium={isPremium}
              canSaveJob={canSaveJob}
            />

            <View style={{ gap: theme.spacing.xs }}>
              <JobCardMeta job={job} showLocation={showLocation} compact />

              <View style={{ alignSelf: "flex-start" }}>
                <JobCardTrustBadges job={job} />
              </View>
            </View>
          </View>

          {descriptionPreview ? (
            <AppText
              variant="bodySm"
              tone="secondary"
              numberOfLines={expanded ? undefined : 3}
              style={{ lineHeight: 21 }}
            >
              {expanded ? fullDescription : descriptionPreview}
            </AppText>
          ) : null}

          {expanded ? (
            <View
              style={{
                gap: theme.spacing.sm,
                borderTopWidth: 1,
                borderTopColor: dividerColor,
                paddingTop: theme.spacing.md,
              }}
            >
              {job.contact_phone ? (
                <View style={{ gap: 4 }}>
                  <AppText variant="caption" tone="tertiary" uppercase>
                    Contact
                  </AppText>
                  <AppText variant="bodySm" weight="700">
                    {job.contact_phone}
                  </AppText>
                </View>
              ) : null}

              {isExpired ? (
                <AppText variant="caption" tone="error">
                  This job has expired. Applications and contact actions may no
                  longer be available.
                </AppText>
              ) : null}

              {onShareJob ? (
                <View style={{ paddingTop: 2 }}>
                  <AppButton
                    title="Share job"
                    onPress={() => onShareJob(job)}
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: dividerColor,
              paddingTop: theme.spacing.md,
              gap: theme.spacing.sm,
            }}
          >
            {hasExpandedContent ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  expanded ? "Show fewer job details" : "Show more job details"
                }
                onPress={() => setExpanded((prev) => !prev)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.72 : 1,
                  alignSelf: "flex-start",
                })}
              >
                <AppText variant="label" tone="secondary" weight="700">
                  {expanded ? "Show less" : "View details"}
                </AppText>
              </Pressable>
            ) : null}

            <JobCardActions
              job={job}
              applied={applied}
              onApply={() => setApplyOpen(true)}
              onViewApplication={onViewApplication}
            />
          </View>
        </View>
      </AppCard>

      <JobCardApplyModal
        visible={applyOpen}
        onClose={() => setApplyOpen(false)}
        submitting={submitting}
        onSubmit={submitApplication}
      />
    </>
  );
}

export default memo(JobCardComponent);
