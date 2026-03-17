import React, { useMemo } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../theme/useTheme";
import { AppText } from "./AppText";

export type FilterChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: (() => void) | null;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function FilterChip({
  label,
  selected = false,
  disabled = false,
  onPress,
  leftIcon,
  rightIcon,
  style,
  testID,
}: FilterChipProps) {
  const { theme } = useTheme();

  const isInteractive = typeof onPress === "function" && !disabled;

  const baseStyle = useMemo<ViewStyle>(() => {
    return {
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: selected ? theme.colors.primary : theme.colors.chipBorder,
      backgroundColor: selected
        ? theme.colors.chipBgSelected
        : theme.colors.chipBg,
      opacity: disabled ? 0.72 : 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    };
  }, [
    disabled,
    selected,
    theme.colors.chipBg,
    theme.colors.chipBgSelected,
    theme.colors.chipBorder,
    theme.colors.primary,
    theme.radius.pill,
    theme.spacing.md,
    theme.spacing.xs,
  ]);

  const selectedPressedStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: theme.colors.surfaceSelected,
      borderColor: theme.colors.primary,
    }),
    [theme.colors.primary, theme.colors.surfaceSelected],
  );

  const unselectedPressedStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: theme.colors.surfacePressed,
      borderColor: theme.colors.borderStrong,
    }),
    [theme.colors.borderStrong, theme.colors.surfacePressed],
  );

  const leftIconWrapStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const rightIconWrapStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      justifyContent: "center",
      marginLeft: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const textColor = disabled
    ? theme.colors.textDisabled
    : selected
      ? theme.colors.chipTextSelected
      : theme.colors.chipText;

  const content = (
    <>
      {leftIcon ? <View style={leftIconWrapStyle}>{leftIcon}</View> : null}

      <AppText
        variant="label"
        weight="700"
        numberOfLines={1}
        style={{ color: textColor }}
      >
        {label}
      </AppText>

      {rightIcon ? <View style={rightIconWrapStyle}>{rightIcon}</View> : null}
    </>
  );

  if (!isInteractive) {
    return (
      <View testID={testID} style={[baseStyle, style]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        baseStyle,
        pressed ? { transform: [{ scale: 0.985 }] } : null,
        pressed
          ? selected
            ? selectedPressedStyle
            : unselectedPressedStyle
          : null,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}
