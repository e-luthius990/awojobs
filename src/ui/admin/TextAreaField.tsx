import React, { useMemo, useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";

import { useTheme } from "../../theme/useTheme";
import { AppText } from "../../ui/AppText";

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  numberOfLines?: number;
  maxLength?: number;
};

export default function TextAreaField({
  label,
  value,
  onChangeText,
  placeholder,
  numberOfLines = 5,
  maxLength = 1000,
}: Props) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

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
          minHeight: 120,
          backgroundColor: theme.colors.bgSurface,
          borderWidth: 1,
          borderColor: focused
            ? theme.colors.primary
            : theme.colors.borderDefault,
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm + 2,
          color: theme.colors.textPrimary,
          fontSize: 14,
        },

        counter: {
          textAlign: "right",
          color: theme.colors.textSecondary,
        },
      }),
    [theme, focused],
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
        multiline
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        textAlignVertical="top"
        style={styles.input}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />

      <AppText variant="caption" style={styles.counter}>
        {value.length}/{maxLength}
      </AppText>
    </View>
  );
}
