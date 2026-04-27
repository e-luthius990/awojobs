import { StyleSheet } from "react-native";

import { lightColors, darkColors } from "./colors";
import { spacing } from "./spacing";
import { radius } from "./radius";
import { typography } from "./typography";
import { createShadows } from "./shadows";
import type {
  MotionScale,
  ThemeMode,
  ThemeTokens,
  ZIndexScale,
} from "./theme.types";

const motion: MotionScale = {
  instant: 70,
  fast: 140,
  normal: 220,
  slow: 320,
  slower: 420,
};

const zIndex: ZIndexScale = {
  base: 0,
  header: 10,
  sticky: 20,
  dropdown: 30,
  sheet: 40,
  modal: 50,
  toast: 60,
  overlay: 70,
};

const layout = {
  screenMaxWidth: 720,
  inputHeight: 52,
  buttonHeight: 52,
  minTouchTarget: 44,
  cardMinHeight: 76,
  appHeaderHeight: 58,
  bottomBarHeight: 68,
} as const;

export const createThemeTokens = (mode: ThemeMode): ThemeTokens => {
  const colors = mode === "dark" ? darkColors : lightColors;
  const shadows = createShadows(colors.shadow, colors.borderFocus);
  const hairlineWidth = StyleSheet.hairlineWidth;

  const cardBase = {
    borderRadius: radius.xl,
    padding: spacing.md,
  } as const;

  const borderedCardBase = {
    ...cardBase,
    borderWidth: hairlineWidth,
  } as const;

  const buttonBase = {
    minHeight: layout.buttonHeight,
    borderRadius: radius.lg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  return {
    mode,
    isDark: mode === "dark",
    colors,
    spacing,
    radius,
    typography,
    shadows,
    motion,
    zIndex,
    layout,

    card: {
      default: {
        ...borderedCardBase,
        backgroundColor: colors.bgSurface,
        borderColor: colors.borderDefault,
        ...shadows.level1,
      },
      elevated: {
        ...borderedCardBase,
        backgroundColor: colors.bgSurfaceElevated,
        borderColor: colors.borderMuted,
        ...shadows.level2,
      },
      muted: {
        ...borderedCardBase,
        backgroundColor: colors.bgSurfaceMuted,
        borderColor: colors.borderDefault,
      },
      premium: {
        backgroundColor: colors.premiumSoft,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: colors.premiumBorder,
        padding: spacing.lg,
        ...shadows.level1,
      },
      sponsored: {
        ...cardBase,
        backgroundColor: colors.sponsoredSoft,
        borderWidth: 1,
        borderColor: colors.sponsoredBorder,
        ...shadows.level1,
      },
      sunken: {
        ...borderedCardBase,
        backgroundColor: colors.bgSurfaceSunken,
        borderColor: colors.borderMuted,
      },
    },

    input: {
      container: {
        gap: spacing.xs,
      },
      field: {
        minHeight: layout.inputHeight,
        borderRadius: radius.lg,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.inputBg,
        borderColor: colors.inputBorder,
      },
    },

    button: {
      primary: {
        ...buttonBase,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
        ...shadows.level1,
      },
      accent: {
        ...buttonBase,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.accent,
      },
      ghost: {
        ...buttonBase,
        paddingHorizontal: spacing.md,
        backgroundColor: "transparent",
      },
      disabled: {
        ...buttonBase,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.buttonDisabledBg,
      },
    },

    hairlineWidth,
  };
};

export const lightTheme = createThemeTokens("light");
export const darkTheme = createThemeTokens("dark");