import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme/useTheme";
import { AppText } from "./AppText";

export type AppButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "whatsapp";

export type AppButtonSize = "sm" | "md" | "lg";

export type AppButtonProps = {
  title: string;
  onPress?: ((event: GestureResponderEvent) => void) | null;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
};

function getHeight(size: AppButtonSize, defaultHeight: number) {
  switch (size) {
    case "sm":
      return 42;
    case "lg":
      return 56;
    case "md":
    default:
      return defaultHeight;
  }
}

function getHorizontalPadding(size: AppButtonSize) {
  switch (size) {
    case "sm":
      return 14;
    case "lg":
      return 20;
    case "md":
    default:
      return 18;
  }
}

function getTextVariant(
  size: AppButtonSize,
): React.ComponentProps<typeof AppText>["variant"] {
  return size === "sm" ? "label" : "labelLg";
}

export function AppButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  style,
  contentStyle,
  testID,
  accessibilityLabel,
}: AppButtonProps) {
  const { theme } = useTheme();

  const isDisabled = disabled || loading;
  const height = getHeight(size, theme.layout.buttonHeight);
  const horizontalPadding = getHorizontalPadding(size);
  const isSmall = size === "sm";

  const resolved = useMemo(() => {
    const sharedBase: ViewStyle = {
      minHeight: height,
      borderRadius: theme.radius.lg,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: horizontalPadding,
    };

    switch (variant) {
      case "secondary":
        return {
          containerStyle: {
            ...sharedBase,
            backgroundColor: theme.colors.bgSurface,
            borderWidth: 1,
            borderColor: theme.colors.borderDefault,
            shadowOpacity: 0,
            elevation: 0,
          } satisfies ViewStyle,
          pressedStyle: {
            backgroundColor: theme.colors.surfacePressed,
            borderColor: theme.colors.borderDefault,
          } satisfies ViewStyle,
          disabledStyle: {
            backgroundColor: theme.colors.buttonDisabledBg,
            borderColor: theme.colors.borderMuted,
            borderWidth: 1,
            shadowOpacity: 0,
            elevation: 0,
          } satisfies ViewStyle,
          textTone: "primary" as const,
          spinnerColor: theme.colors.primary,
        };

      case "ghost":
        return {
          containerStyle: {
            ...sharedBase,
            paddingHorizontal: Math.max(0, horizontalPadding - 2),
            backgroundColor: "transparent",
            shadowOpacity: 0,
            elevation: 0,
          } satisfies ViewStyle,
          pressedStyle: {
            backgroundColor: theme.colors.buttonGhostBgPressed,
          } satisfies ViewStyle,
          disabledStyle: {
            backgroundColor: "transparent",
            borderWidth: 0,
            shadowOpacity: 0,
            elevation: 0,
          } satisfies ViewStyle,
          textTone: "primary" as const,
          spinnerColor: theme.colors.primary,
        };

      case "destructive":
        return {
          containerStyle: {
            ...sharedBase,
            backgroundColor: theme.colors.error,
            shadowOpacity: 0,
            elevation: 0,
          } satisfies ViewStyle,
          pressedStyle: {
            opacity: 0.96,
          } satisfies ViewStyle,
          disabledStyle: {
            backgroundColor: theme.colors.buttonDisabledBg,
            borderWidth: 0,
            shadowOpacity: 0,
            elevation: 0,
          } satisfies ViewStyle,
          textTone: "inverse" as const,
          spinnerColor: theme.colors.textInverse,
        };

      case "whatsapp":
        return {
          containerStyle: {
            ...sharedBase,
            backgroundColor: "#25D366",
            borderWidth: 0,
            shadowOpacity: 0,
            elevation: 0,
          } satisfies ViewStyle,
          pressedStyle: {
            backgroundColor: "#1EBE5D",
            opacity: 0.96,
          } satisfies ViewStyle,
          disabledStyle: {
            backgroundColor: theme.colors.buttonDisabledBg,
            borderWidth: 0,
            shadowOpacity: 0,
            elevation: 0,
          } satisfies ViewStyle,
          textTone: "inverse" as const,
          spinnerColor: theme.colors.textInverse,
        };

      case "primary":
      default:
        return {
          containerStyle: {
            ...theme.button.primary,
            minHeight: height,
            borderRadius: theme.radius.lg,
            paddingHorizontal: horizontalPadding,
            ...(isSmall
              ? {
                  shadowOpacity: 0,
                  elevation: 0,
                }
              : null),
          } satisfies ViewStyle,
          pressedStyle: {
            backgroundColor: theme.colors.primaryPressed,
          } satisfies ViewStyle,
          disabledStyle: {
            backgroundColor: theme.colors.buttonDisabledBg,
            borderWidth: 0,
            shadowOpacity: 0,
            elevation: 0,
          } satisfies ViewStyle,
          textTone: "inverse" as const,
          spinnerColor: theme.colors.primaryTextOnColor,
        };
    }
  }, [
    height,
    horizontalPadding,
    isSmall,
    theme.button.primary,
    theme.colors.bgSurface,
    theme.colors.borderDefault,
    theme.colors.borderMuted,
    theme.colors.buttonDisabledBg,
    theme.colors.buttonGhostBgPressed,
    theme.colors.error,
    theme.colors.primary,
    theme.colors.primaryPressed,
    theme.colors.primaryTextOnColor,
    theme.colors.surfacePressed,
    theme.colors.textInverse,
    theme.radius.lg,
    variant,
  ]);

  const frameStyle = useMemo<ViewStyle>(
    () => ({
      width: fullWidth ? "100%" : undefined,
      alignSelf: fullWidth ? "stretch" : "flex-start",
    }),
    [fullWidth],
  );

  const innerContentBase = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      minHeight: height,
    }),
    [height],
  );

  const iconLeftStyle = useMemo<ViewStyle>(
    () => ({
      marginRight: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const iconRightStyle = useMemo<ViewStyle>(
    () => ({
      marginLeft: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const labelWrapStyle = useMemo<ViewStyle>(
    () => ({
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    }),
    [],
  );

  const spinnerWrapStyle = useMemo<ViewStyle>(
    () => ({
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    }),
    [],
  );

  const textTone = isDisabled ? "disabled" : resolved.textTone;
  const spinnerColor = isDisabled
    ? theme.colors.buttonDisabledText
    : resolved.spinnerColor;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress ?? undefined}
      style={({ pressed }) => [
        resolved.containerStyle,
        frameStyle,
        isDisabled ? resolved.disabledStyle : null,
        !isDisabled && pressed ? { opacity: 0.96 } : null,
        !isDisabled && pressed ? resolved.pressedStyle : null,
        style,
      ]}
    >
      <View style={[innerContentBase, contentStyle]}>
        {leftIcon ? <View style={iconLeftStyle}>{leftIcon}</View> : null}

        <View style={labelWrapStyle}>
          <AppText
            variant={getTextVariant(size)}
            tone={textTone}
            weight="700"
            numberOfLines={1}
            style={loading ? { opacity: 0 } : undefined}
          >
            {title}
          </AppText>

          {loading ? (
            <View pointerEvents="none" style={spinnerWrapStyle}>
              <ActivityIndicator size="small" color={spinnerColor} />
            </View>
          ) : null}
        </View>

        {rightIcon ? <View style={iconRightStyle}>{rightIcon}</View> : null}
      </View>
    </Pressable>
  );
}
