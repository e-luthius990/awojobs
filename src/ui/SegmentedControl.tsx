import React, { useMemo } from "react";
import { Pressable, View, type ViewStyle } from "react-native";

import { useTheme } from "../theme/useTheme";
import { AppText } from "./AppText";

export type SegmentedControlOption<T extends string> = {
  label: string;
  value: T;
  disabled?: boolean;
};

export type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedControlOption<T>[];
  onChange: (value: T) => void;
  fullWidth?: boolean;
  testID?: string;
};

const SEGMENT_INSET = 4;

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  fullWidth = true,
  testID,
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      alignSelf: fullWidth ? "stretch" : "flex-start",
      backgroundColor: theme.colors.bgSurfaceMuted,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      padding: SEGMENT_INSET,
    }),
    [
      fullWidth,
      theme.colors.bgSurfaceMuted,
      theme.colors.borderDefault,
      theme.radius.pill,
    ],
  );

  const baseOptionStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
    }),
    [theme.radius.pill, theme.spacing.md],
  );

  const selectedOptionStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: theme.colors.bgSurfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
    }),
    [theme.colors.bgSurfaceElevated, theme.colors.borderStrong],
  );

  const unselectedPressedStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: theme.colors.buttonGhostBgPressed,
    }),
    [theme.colors.buttonGhostBgPressed],
  );

  return (
    <View testID={testID} accessibilityRole="tablist" style={containerStyle}>
      {options.map((option, index) => {
        const selected = option.value === value;
        const disabled = Boolean(option.disabled);

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => {
              if (disabled || selected) return;
              onChange(option.value);
            }}
            style={({ pressed }) => [
              baseOptionStyle,
              fullWidth ? { flex: 1 } : null,
              index > 0 ? { marginLeft: SEGMENT_INSET } : null,
              selected ? selectedOptionStyle : null,
              !selected && pressed && !disabled ? unselectedPressedStyle : null,
              pressed && !disabled ? { transform: [{ scale: 0.985 }] } : null,
              disabled ? { opacity: 0.65 } : null,
            ]}
          >
            <AppText
              variant="label"
              tone={selected ? "primary" : "secondary"}
              weight="700"
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
