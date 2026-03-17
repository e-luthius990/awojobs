import React, { useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../theme/useTheme";
import { AppText } from "./AppText";

export type InlineAlertTone = "info" | "success" | "warning" | "error";

export type InlineAlertProps = {
  title?: string;
  message: string;
  tone?: InlineAlertTone;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function InlineAlert({
  title,
  message,
  tone = "info",
  icon,
  action,
  style,
  testID,
}: InlineAlertProps) {
  const { theme } = useTheme();

  const palette = useMemo(() => {
    switch (tone) {
      case "success":
        return {
          backgroundColor: theme.colors.successSoft,
          borderColor: theme.colors.verifiedBorder,
          titleTone: "success" as const,
        };
      case "warning":
        return {
          backgroundColor: theme.colors.warningSoft,
          borderColor: theme.colors.warning,
          titleTone: "warning" as const,
        };
      case "error":
        return {
          backgroundColor: theme.colors.errorSoft,
          borderColor: theme.colors.error,
          titleTone: "error" as const,
        };
      case "info":
      default:
        return {
          backgroundColor: theme.colors.infoSoft,
          borderColor: theme.colors.sponsoredBorder,
          titleTone: "info" as const,
        };
    }
  }, [
    theme.colors.error,
    theme.colors.errorSoft,
    theme.colors.infoSoft,
    theme.colors.sponsoredBorder,
    theme.colors.successSoft,
    theme.colors.verifiedBorder,
    theme.colors.warning,
    theme.colors.warningSoft,
    tone,
  ]);

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      borderRadius: theme.radius.xl,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      backgroundColor: palette.backgroundColor,
      borderWidth: 1,
      borderColor: palette.borderColor,
    }),
    [
      palette.backgroundColor,
      palette.borderColor,
      theme.radius.xl,
      theme.spacing.md,
    ],
  );

  const rowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
    }),
    [],
  );

  const iconWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: 1,
      marginRight: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    }),
    [theme.spacing.sm],
  );

  const bodyStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      minWidth: 0,
    }),
    [],
  );

  const messageStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: title ? theme.spacing.xxs : 0,
    }),
    [theme.spacing.xxs, title],
  );

  const actionWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  return (
    <View
      testID={testID}
      accessibilityLiveRegion={
        tone === "error" || tone === "warning" ? "polite" : undefined
      }
      style={[containerStyle, style]}
    >
      <View style={rowStyle}>
        {icon ? <View style={iconWrapStyle}>{icon}</View> : null}

        <View style={bodyStyle}>
          {title ? (
            <AppText variant="labelLg" tone={palette.titleTone} weight="700">
              {title}
            </AppText>
          ) : null}

          <AppText variant="bodySm" tone="secondary" style={messageStyle}>
            {message}
          </AppText>
        </View>
      </View>

      {action ? <View style={actionWrapStyle}>{action}</View> : null}
    </View>
  );
}
