import React, { useMemo } from "react";
import {
  Pressable,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme/useTheme";
import type { ThemeTokens } from "../theme/theme.types";

export type AppCardVariant =
  | "default"
  | "elevated"
  | "muted"
  | "premium"
  | "sponsored"
  | "sunken";

export type AppCardPadding = "none" | "sm" | "md" | "lg";

export type AppCardProps = {
  children: React.ReactNode;
  variant?: AppCardVariant;
  padding?: AppCardPadding;
  onPress?: ((event: GestureResponderEvent) => void) | null;
  disabled?: boolean;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
} & Omit<PressableProps, "style">;

function resolvePadding(
  padding: AppCardPadding,
  spacing: ThemeTokens["spacing"],
): ViewStyle {
  switch (padding) {
    case "none":
      return { padding: 0 };
    case "sm":
      return { padding: spacing.sm };
    case "lg":
      return { padding: spacing.lg };
    case "md":
    default:
      return { padding: spacing.md };
  }
}

export function AppCard({
  children,
  variant = "default",
  padding = "md",
  onPress,
  disabled = false,
  bordered = true,
  style,
  contentStyle,
  testID,
  ...rest
}: AppCardProps) {
  const { theme } = useTheme();

  const isInteractive = typeof onPress === "function" && !disabled;

  const baseCardStyle = useMemo<ViewStyle>(() => {
    const resolved: ViewStyle = {
      ...theme.card[variant],
      ...resolvePadding(padding, theme.spacing),
    };

    if (!bordered) {
      resolved.borderWidth = 0;
      resolved.borderColor = "transparent";
    }

    return resolved;
  }, [bordered, padding, theme.card, theme.spacing, variant]);

  const disabledCardStyle = useMemo<ViewStyle | null>(() => {
    if (!disabled) return null;

    return {
      opacity: 0.72,
      shadowOpacity: 0,
      elevation: 0,
    };
  }, [disabled]);

  const pressedStyle = useMemo<ViewStyle>(() => {
    switch (variant) {
      case "premium":
        return {
          borderColor: theme.colors.premiumBorder,
          opacity: 0.96,
          transform: [{ scale: 0.997 }],
        };
      case "sponsored":
        return {
          borderColor: theme.colors.sponsoredBorder,
          opacity: 0.96,
          transform: [{ scale: 0.997 }],
        };
      case "muted":
      case "sunken":
      case "elevated":
      case "default":
      default:
        return {
          backgroundColor: theme.colors.surfacePressed,
          borderColor: theme.colors.borderStrong,
          transform: [{ scale: 0.997 }],
        };
    }
  }, [
    theme.colors.borderStrong,
    theme.colors.premiumBorder,
    theme.colors.sponsoredBorder,
    theme.colors.surfacePressed,
    variant,
  ]);

  const content = contentStyle ? (
    <View style={contentStyle}>{children}</View>
  ) : (
    <>{children}</>
  );

  if (!onPress) {
    return (
      <View testID={testID} style={[baseCardStyle, disabledCardStyle, style]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        baseCardStyle,
        disabledCardStyle,
        isInteractive && pressed ? pressedStyle : null,
        style,
      ]}
      {...rest}
    >
      {content}
    </Pressable>
  );
}
