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
  isPremium?: boolean;
};

export default function JobCardHeader({
  job,
  saved,
  applied,
  onToggleSave,
  isSponsored = false,
}: Props) {
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);

  const handleToggleSave = useCallback(async () => {
    if (busy) return;

    setBusy(true);
    try {
      await onToggleSave();
    } finally {
      setBusy(false);
    }
  }, [busy, onToggleSave]);

  const wrapperStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const topRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const badgeRowStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      paddingRight: theme.spacing.sm,
    }),
    [theme.spacing.sm, theme.spacing.xs],
  );

  const saveButtonStyle = useMemo<ViewStyle>(
    () => ({
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.bgSurfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
    }),
    [
      theme.colors.bgSurfaceMuted,
      theme.colors.borderDefault,
      theme.radius.pill,
    ],
  );

  return (
    <View style={wrapperStyle}>
      <View style={topRowStyle}>
        <View style={badgeRowStyle}>
          {isSponsored ? (
            <StatusBadge label="Sponsored" tone="sponsored" />
          ) : null}

          {applied ? <StatusBadge label="Applied" tone="success" /> : null}
        </View>

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
      </View>

      <AppText variant="title" weight="700" numberOfLines={2}>
        {job.title}
      </AppText>
    </View>
  );
}
