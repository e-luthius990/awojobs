import React, { useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../theme/useTheme";
import { AppText } from "./AppText";

export type StatusBadgeTone =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "premium"
  | "sponsored"
  | "verified";

export type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function StatusBadge({
  label,
  tone = "default",
  style,
  testID,
}: StatusBadgeProps) {
  const { theme } = useTheme();

  const palette = useMemo(() => {
    switch (tone) {
      case "success":
        return {
          backgroundColor: theme.colors.successSoft,
          borderColor: theme.colors.verifiedBorder,
          textTone: "success" as const,
        };

      case "warning":
        return {
          backgroundColor: theme.colors.warningSoft,
          borderColor: theme.colors.warning,
          textTone: "warning" as const,
        };

      case "error":
        return {
          backgroundColor: theme.colors.errorSoft,
          borderColor: theme.colors.error,
          textTone: "error" as const,
        };

      case "info":
        return {
          backgroundColor: theme.colors.infoSoft,
          borderColor: theme.colors.borderMuted ?? theme.colors.borderDefault,
          textTone: "info" as const,
        };

      case "premium":
        return {
          backgroundColor: theme.colors.premiumSoft,
          borderColor: theme.colors.premiumBorder,
          textTone: "primary" as const,
        };

      case "sponsored":
        return {
          backgroundColor: theme.colors.sponsoredSoft,
          borderColor: theme.colors.sponsoredBorder,
          textTone: "info" as const,
        };

      case "verified":
        return {
          backgroundColor: theme.colors.verifiedSoft,
          borderColor: theme.colors.verifiedBorder,
          textTone: "success" as const,
        };

      case "default":
      default:
        return {
          backgroundColor: theme.colors.bgSurfaceMuted,
          borderColor: theme.colors.borderMuted ?? theme.colors.borderDefault,
          textTone: "secondary" as const,
        };
    }
  }, [
    theme.colors.bgSurfaceMuted,
    theme.colors.borderDefault,
    theme.colors.borderMuted,
    theme.colors.error,
    theme.colors.errorSoft,
    theme.colors.infoSoft,
    theme.colors.premiumBorder,
    theme.colors.premiumSoft,
    theme.colors.sponsoredBorder,
    theme.colors.sponsoredSoft,
    theme.colors.successSoft,
    theme.colors.verifiedBorder,
    theme.colors.verifiedSoft,
    theme.colors.warning,
    theme.colors.warningSoft,
    tone,
  ]);

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      alignSelf: "flex-start",
      minHeight: 24,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radius.pill,
      backgroundColor: palette.backgroundColor,
      borderWidth: 1,
      borderColor: palette.borderColor,
      alignItems: "center",
      justifyContent: "center",
    }),
    [palette.backgroundColor, palette.borderColor, theme.radius.pill],
  );

  return (
    <View testID={testID} style={[containerStyle, style]}>
      <AppText
        variant="caption"
        tone={palette.textTone}
        weight="600"
        numberOfLines={1}
      >
        {label}
      </AppText>
    </View>
  );
}
