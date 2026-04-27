import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../../../theme/useTheme";
import { AppCard } from "../../AppCard";
import { AppButton } from "../../AppButton";
import { AppText } from "../../AppText";
import { StatusBadge } from "../../StatusBadge";

type PremiumCardMode = "upgrade" | "active" | "expired";

type Props = {
  mode: PremiumCardMode;
  onPress?: () => void;
  daysRemaining?: number;
};

export default function PremiumUpgradeCard({
  mode,
  onPress,
  daysRemaining = 0,
}: Props) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginBottom: 0,
        },

        content: {
          gap: theme.spacing.sm,
        },

        upgradeCard: {
          backgroundColor: "#FFF8E7",
          borderColor: "#E9C97A",
          borderWidth: 1,
        },

        activeCard: {
          backgroundColor: theme.colors.successSoft,
          borderColor: theme.colors.verifiedBorder,
          borderWidth: 1,
        },

        expiredCard: {
          backgroundColor: theme.colors.warningSoft,
          borderColor: theme.colors.warning,
          borderWidth: 1,
        },

        upgradeText: {
          color: "#5F4508",
        },

        activeText: {
          color: theme.colors.textPrimary,
        },

        expiredText: {
          color: theme.colors.textPrimary,
        },

        statusRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.sm,
        },
      }),
    [theme],
  );

  if (mode === "active") {
    return (
      <AppCard padding="md" style={[styles.container, styles.activeCard]}>
        <View style={styles.content}>
          <View style={styles.statusRow}>
            <StatusBadge label="Premium Active" tone="verified" />
          </View>

          <AppText variant="bodySm" weight="700" style={styles.activeText}>
            {daysRemaining > 0
              ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`
              : "Premium access is active"}
          </AppText>
        </View>
      </AppCard>
    );
  }

  if (mode === "expired") {
    return (
      <AppCard padding="md" style={[styles.container, styles.expiredCard]}>
        <View style={styles.content}>
          <View style={styles.statusRow}>
            <StatusBadge label="Premium Expired" tone="warning" />
          </View>

          <AppText variant="bodySm" weight="700" style={styles.expiredText}>
            Renew to continue browsing all jobs across Uganda
          </AppText>

          <AppButton
            title="Renew Premium"
            onPress={onPress}
            variant="primary"
            size="sm"
          />
        </View>
      </AppCard>
    );
  }

  return (
    <AppCard padding="md" style={[styles.container, styles.upgradeCard]}>
      <View style={styles.content}>
        <AppText variant="bodySm" weight="700" style={styles.upgradeText}>
          View all jobs across Uganda
        </AppText>

        <AppButton
          title="Upgrade to Premium"
          onPress={onPress}
          variant="primary"
          size="sm"
        />
      </View>
    </AppCard>
  );
}
