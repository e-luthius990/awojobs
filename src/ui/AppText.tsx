import React, { memo, useMemo } from "react";
import {
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from "react-native";

import { useTheme } from "../theme/useTheme";
import type { ThemeTokens } from "../theme/theme.types";

type AppTextVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "titleLg"
  | "title"
  | "bodyLg"
  | "body"
  | "bodySm"
  | "labelLg"
  | "label"
  | "caption"
  | "captionSm";

type AppTextTone =
  | "primary"
  | "secondary"
  | "tertiary"
  | "disabled"
  | "inverse"
  | "link"
  | "success"
  | "warning"
  | "error"
  | "info";

export type AppTextProps = Omit<TextProps, "style"> & {
  variant?: AppTextVariant;
  tone?: AppTextTone;
  align?: TextStyle["textAlign"];
  weight?: TextStyle["fontWeight"];
  dimmed?: boolean;
  uppercase?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
};

function resolveToneColor(
  tone: AppTextTone,
  colors: ThemeTokens["colors"],
  dimmed: boolean,
): string {
  if (dimmed) {
    switch (tone) {
      case "inverse":
        return colors.textInverse;
      case "link":
        return colors.textSecondary;
      case "success":
      case "warning":
      case "error":
      case "info":
        return colors.textSecondary;
      case "disabled":
        return colors.textDisabled;
      case "secondary":
      case "tertiary":
        return colors.textTertiary;
      case "primary":
      default:
        return colors.textSecondary;
    }
  }

  switch (tone) {
    case "secondary":
      return colors.textSecondary;
    case "tertiary":
      return colors.textTertiary;
    case "disabled":
      return colors.textDisabled;
    case "inverse":
      return colors.textInverse;
    case "link":
      return colors.textLink;
    case "success":
      return colors.success;
    case "warning":
      return colors.warning;
    case "error":
      return colors.error;
    case "info":
      return colors.info;
    case "primary":
    default:
      return colors.textPrimary;
  }
}

function getUppercaseLetterSpacing(
  baseLetterSpacing: TextStyle["letterSpacing"],
): number {
  const base = typeof baseLetterSpacing === "number" ? baseLetterSpacing : 0;
  return base + 0.12;
}

function AppTextComponent({
  variant = "body",
  tone = "primary",
  align,
  weight,
  dimmed = false,
  uppercase = false,
  style,
  children,
  allowFontScaling = true,
  ...rest
}: AppTextProps) {
  const { theme } = useTheme();

  const typographyStyle = theme.typography[variant];

  const resolvedColor = useMemo(() => {
    return resolveToneColor(tone, theme.colors, dimmed);
  }, [tone, theme.colors, dimmed]);

  const baseStyle = useMemo<TextStyle>(
    () => ({
      color: resolvedColor,
      ...(align ? { textAlign: align } : null),
      ...(weight ? { fontWeight: weight } : null),
    }),
    [resolvedColor, align, weight],
  );

  const uppercaseStyle = useMemo<TextStyle | null>(() => {
    if (!uppercase) return null;

    return {
      textTransform: "uppercase",
      letterSpacing: getUppercaseLetterSpacing(typographyStyle.letterSpacing),
    };
  }, [uppercase, typographyStyle.letterSpacing]);

  return (
    <Text
      allowFontScaling={allowFontScaling}
      style={[typographyStyle, baseStyle, uppercaseStyle, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export const AppText = memo(AppTextComponent);
