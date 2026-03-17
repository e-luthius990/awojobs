import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../../../theme/useTheme";
import { AppCard } from "../../AppCard";
import { AppButton } from "../../AppButton";
import { AppText } from "../../AppText";
import { StatusBadge } from "../../StatusBadge";

type Props = {
  onPress: () => void;
};

export default function PremiumUpgradeCard({ onPress }: Props) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginBottom: theme.spacing.md,
        },

        content: {
          gap: theme.spacing.md,
        },

        textBlock: {
          gap: theme.spacing.xs,
        },
      }),
    [theme],
  );

  return (
    <AppCard variant="premium" padding="md" style={styles.container}>
      <View style={styles.content}>
        <StatusBadge label="Premium Access" tone="premium" />

        <View style={styles.textBlock}>
          <AppText variant="titleLg">Unlock Nationwide Jobs</AppText>

          <AppText variant="bodySm" tone="secondary">
            Explore jobs across Uganda and go beyond your district on AwoJobs.
          </AppText>
        </View>

        <AppButton
          title="Upgrade to Premium"
          onPress={onPress}
          variant="primary"
        />
      </View>
    </AppCard>
  );
}
