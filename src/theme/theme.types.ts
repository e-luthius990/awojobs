import type { TextStyle, ViewStyle } from "react-native";

export type ThemeMode = "light" | "dark";
export type ThemePreference = "system" | ThemeMode;

type ReadonlyRecord<T> = {
  readonly [K in keyof T]: T[K];
};

export type AppColors = ReadonlyRecord<{
  bgApp: string;
  bgSurface: string;
  bgSurfaceMuted: string;
  bgSurfaceElevated: string;
  bgSurfaceSunken: string;
  bgOverlay: string;
  bgBackdrop: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textInverse: string;
  textLink: string;

  borderDefault: string;
  borderMuted: string;
  borderStrong: string;
  borderFocus: string;
  divider: string;

  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryTextOnColor: string;

  accent: string;
  accentPressed: string;
  accentSoft: string;
  accentTextOnColor: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  info: string;
  infoSoft: string;

  premiumBase: string;
  premiumSoft: string;
  premiumBorder: string;

  sponsoredBase: string;
  sponsoredSoft: string;
  sponsoredBorder: string;

  verifiedBase: string;
  verifiedSoft: string;
  verifiedBorder: string;

  chipBg: string;
  chipBgSelected: string;
  chipBorder: string;
  chipText: string;
  chipTextSelected: string;

  inputBg: string;
  inputBorder: string;
  inputBorderFocused: string;
  inputBorderError: string;
  inputText: string;
  inputPlaceholder: string;

  buttonGhostBgPressed: string;
  buttonDisabledBg: string;
  buttonDisabledText: string;

  surfacePressed: string;
  surfaceSelected: string;

  shadow: string;
}>;

export type SpacingScale = ReadonlyRecord<{
  xxxs: number;
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  section: number;
  screenX: number;
  screenY: number;
}>;

export type RadiusScale = ReadonlyRecord<{
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  pill: number;
}>;

export type TypographyToken = TextStyle;

export type TypographyScale = ReadonlyRecord<{
  display: TypographyToken;
  h1: TypographyToken;
  h2: TypographyToken;
  h3: TypographyToken;
  titleLg: TypographyToken;
  title: TypographyToken;
  bodyLg: TypographyToken;
  body: TypographyToken;
  bodySm: TypographyToken;
  labelLg: TypographyToken;
  label: TypographyToken;
  caption: TypographyToken;
  captionSm: TypographyToken;
}>;

export type ShadowScale = ReadonlyRecord<{
  level0: ViewStyle;
  level1: ViewStyle;
  level2: ViewStyle;
  level3: ViewStyle;
  focusRing: ViewStyle;
}>;

export type MotionScale = ReadonlyRecord<{
  instant: number;
  fast: number;
  normal: number;
  slow: number;
  slower: number;
}>;

export type ZIndexScale = ReadonlyRecord<{
  base: number;
  header: number;
  sticky: number;
  dropdown: number;
  sheet: number;
  modal: number;
  toast: number;
  overlay: number;
}>;

export type LayoutScale = ReadonlyRecord<{
  screenMaxWidth: number;
  inputHeight: number;
  buttonHeight: number;
  minTouchTarget: number;
  cardMinHeight: number;
  appHeaderHeight: number;
  bottomBarHeight: number;
}>;

export type CardRecipes = ReadonlyRecord<{
  default: ViewStyle;
  elevated: ViewStyle;
  muted: ViewStyle;
  premium: ViewStyle;
  sponsored: ViewStyle;
  sunken: ViewStyle;
}>;

export type InputRecipes = ReadonlyRecord<{
  container: ViewStyle;
  field: ViewStyle;
}>;

export type ButtonRecipes = ReadonlyRecord<{
  primary: ViewStyle;
  accent: ViewStyle;
  ghost: ViewStyle;
  disabled: ViewStyle;
}>;

export type ThemeTokens = Readonly<{
  mode: ThemeMode;
  isDark: boolean;

  colors: AppColors;
  spacing: SpacingScale;
  radius: RadiusScale;
  typography: TypographyScale;
  shadows: ShadowScale;
  motion: MotionScale;
  zIndex: ZIndexScale;
  layout: LayoutScale;

  card: CardRecipes;
  input: InputRecipes;
  button: ButtonRecipes;

  hairlineWidth: number;
}>;

export type ThemeContextValue = {
  theme: ThemeTokens;
  mode: ThemeMode;
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
};