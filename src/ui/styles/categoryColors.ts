export type CategoryTone = {
  light: {
    bg: string;
    text: string;
    border: string;
  };
  dark: {
    bg: string;
    text: string;
    border: string;
  };
};

export const CATEGORY_COLORS: Record<string, CategoryTone> = {
  Construction: {
    light: {
      bg: "#F3ECE6",
      text: "#6B3F26",
      border: "#D8B89F",
    },
    dark: {
      bg: "#2A1E18",
      text: "#E7C6AF",
      border: "#6B4A38",
    },
  },

  Retail: {
    light: {
      bg: "#E9F3EF",
      text: "#1F5E43",
      border: "#B9DCCA",
    },
    dark: {
      bg: "#162720",
      text: "#9ED8BA",
      border: "#2D5B46",
    },
  },

  Hospitality: {
    light: {
      bg: "#EAF2FA",
      text: "#1F4E79",
      border: "#BDD3EA",
    },
    dark: {
      bg: "#162331",
      text: "#A9CAE8",
      border: "#31506F",
    },
  },

  Transport: {
    light: {
      bg: "#F6F2E8",
      text: "#5A4A1F",
      border: "#DED1AC",
    },
    dark: {
      bg: "#282314",
      text: "#DCCA8A",
      border: "#5C5130",
    },
  },

  Cleaning: {
    light: {
      bg: "#F1F3F5",
      text: "#374151",
      border: "#D5DBE1",
    },
    dark: {
      bg: "#1B2025",
      text: "#C5CDD6",
      border: "#3B4550",
    },
  },

  Default: {
    light: {
      bg: "#F3F4F6",
      text: "#374151",
      border: "#D1D5DB",
    },
    dark: {
      bg: "#1A1F24",
      text: "#C7CED6",
      border: "#39424C",
    },
  },
};