import React, { useCallback, useMemo, useState } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { JobWithCoords } from "../../jobs/jobs.types";

import { useTheme } from "../../../theme/useTheme";
import { AppText } from "../../AppText";
import { StatusBadge } from "../../StatusBadge";

type Props = {
  job: JobWithCoords;
  saved: boolean;
  applied: boolean;
  onToggleSave: () => Promise<void> | void;
  isSponsored?: boolean;
  canSaveJob?: boolean;
};

function parseSafeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isFreshWithinHours(date: Date | null, hours: number) {
  if (!date) return false;
  const diffMs = Date.now() - date.getTime();
  return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000;
}

export default function JobCardHeader({
  job,
  saved,
  applied,
  onToggleSave,
  isSponsored = false,
  canSaveJob = false,
}: Props) {
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);

  const handleToggleSave = useCallback(async () => {
    if (busy || !canSaveJob) return;

    setBusy(true);
    try {
      await onToggleSave();
    } finally {
      setBusy(false);
    }
  }, [busy, canSaveJob, onToggleSave]);

  const createdDate = useMemo(
    () => parseSafeDate(job.created_at ?? job.posted_from_device_at),
    [job.created_at, job.posted_from_device_at],
  );

  const headerBadge = useMemo(() => {
    if (applied) {
      return <StatusBadge label="Applied" tone="success" />;
    }

    if (isSponsored) {
      return <StatusBadge label="Sponsored" tone="sponsored" />;
    }

    if (isFreshWithinHours(createdDate, 24)) {
      return <StatusBadge label="New" tone="info" />;
    }

    return null;
  }, [applied, createdDate, isSponsored]);

  const wrapperStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      minWidth: 0,
    }),
    [],
  );

  const titleClusterStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      minWidth: 0,
    }),
    [theme.spacing.sm],
  );

  const titleWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      minWidth: 0,
    }),
    [],
  );

  const badgeWrapStyle = useMemo<ViewStyle>(
    () => ({
      alignSelf: "flex-start",
      marginTop: 2,
      flexShrink: 0,
    }),
    [],
  );

  const saveButtonStyle = useMemo<ViewStyle>(
    () => ({
      width: 36,
      height: 36,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.bgSurface,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle ?? theme.colors.borderDefault,
    }),
    [
      theme.colors.bgSurface,
      theme.colors.borderDefault,
      theme.colors.borderSubtle,
      theme.radius.pill,
    ],
  );

  return (
    <View style={wrapperStyle}>
      <View style={contentStyle}>
        <View style={titleClusterStyle}>
          <View style={titleWrapStyle}>
            <AppText variant="title" weight="700" numberOfLines={2}>
              {job.title}
            </AppText>
          </View>

          {headerBadge ? (
            <View style={badgeWrapStyle}>{headerBadge}</View>
          ) : null}
        </View>
      </View>

      {canSaveJob ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? "Remove saved job" : "Save job"}
          accessibilityState={{ disabled: busy, selected: saved }}
          onPress={handleToggleSave}
          disabled={busy}
          hitSlop={8}
          style={({ pressed }) => [
            saveButtonStyle,
            busy ? { opacity: 0.65 } : null,
            pressed && !busy
              ? {
                  opacity: 0.92,
                  backgroundColor: theme.colors.buttonGhostBgPressed,
                  borderColor: theme.colors.borderStrong,
                }
              : null,
          ]}
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={18}
            color={saved ? theme.colors.warning : theme.colors.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
