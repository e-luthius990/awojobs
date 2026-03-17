import React, { useMemo } from "react";
import { View, TextInput, StyleSheet } from "react-native";

import { useTheme } from "../../theme/useTheme";
import { AppText } from "../../ui/AppText";

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export default function NumberField({
  label,
  value,
  onChangeText,
  placeholder,
}: Props) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          gap: theme.spacing.xs,
        },
        label: {
          color: theme.colors.textPrimary,
        },
        input: {
          minHeight: 48,
          backgroundColor: theme.colors.bgSurface,
          borderWidth: 1,
          borderColor: theme.colors.borderDefault,
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.md,
          color: theme.colors.textPrimary,
          fontSize: 14,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.wrap}>
      <AppText variant="label" weight="700" style={styles.label}>
        {label}
      </AppText>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType="numeric"
        style={styles.input}
      />
    </View>
  );
}
