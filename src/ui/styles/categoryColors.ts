export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string }
> = {
  Construction: {
    bg: "#F3ECE6", // warm sand
    text: "#6B3F26", // deep clay
  },

  Retail: {
    bg: "#E9F3EF", // soft mint
    text: "#1F5E43", // forest green
  },

  Hospitality: {
    bg: "#EAF2FA", // soft blue
    text: "#1F4E79", // navy blue
  },

  Transport: {
    bg: "#F6F2E8", // khaki neutral
    text: "#5A4A1F", // olive brown
  },

  Cleaning: {
    bg: "#F1F3F5", // neutral grey
    text: "#374151", // slate
  },

  // ✅ REQUIRED fallback
  Default: {
    bg: "#F3F4F6",
    text: "#374151",
  },
};
