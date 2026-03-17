import React, { memo, useMemo } from "react";
import { View, Switch, Pressable, StyleSheet } from "react-native";

import { useTheme } from "../../theme/useTheme";
import { AppText } from "../../ui/AppText";

type Props = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function ToggleField({ label, value, onValueChange }: Props) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          minHeight: 52,
          backgroundColor: theme.colors.bgSurface,
          borderWidth: 1,
          borderColor: value
            ? theme.colors.primary
            : theme.colors.borderDefault,
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.md,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.md,
        },

        label: {
          flex: 1,
          color: theme.colors.textPrimary,
        },
      }),
    [theme, value],
  );

  const toggle = () => onValueChange(!value);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed ? { opacity: 0.92 } : null]}
      onPress={toggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <AppText variant="bodySm" weight="700" style={styles.label}>
        {label}
      </AppText>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.colors.borderStrong ?? theme.colors.borderDefault,
          true: theme.colors.primary,
        }}
        thumbColor={theme.colors.textInverse ?? "#FFFFFF"}
      />
    </Pressable>
  );
}

export default memo(ToggleField);
