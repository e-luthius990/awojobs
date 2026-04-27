import type { TypographyScale } from "./theme.types";

const baseFont = {
  fontFamily: "System",
} as const;

export const typography: TypographyScale = {
  display: {
    ...baseFont,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -0.6,
  },

  h1: {
    ...baseFont,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.45,
  },

  h2: {
    ...baseFont,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  h3: {
    ...baseFont,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "700",
    letterSpacing: -0.1,
  },

  titleLg: {
    ...baseFont,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.08,
  },

  title: {
    ...baseFont,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
    letterSpacing: -0.04,
  },

  bodyLg: {
    ...baseFont,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
    letterSpacing: 0,
  },

  body: {
    ...baseFont,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
    letterSpacing: 0,
  },

  bodySm: {
    ...baseFont,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    letterSpacing: 0,
  },

  labelLg: {
    ...baseFont,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0.08,
  },

  label: {
    ...baseFont,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.08,
  },

  caption: {
    ...baseFont,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.08,
  },

  captionSm: {
    ...baseFont,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    letterSpacing: 0.08,
  },
};