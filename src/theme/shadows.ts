import { Platform } from "react-native";
import type { ShadowScale } from "./theme.types";

function createDepth(
  shadowColor: string,
  ios: {
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
  },
  androidElevation: number,
) {
  if (Platform.OS === "ios") {
    return {
      shadowColor,
      shadowOpacity: ios.shadowOpacity,
      shadowRadius: ios.shadowRadius,
      shadowOffset: ios.shadowOffset,
    };
  }

  if (Platform.OS === "android") {
    return {
      elevation: androidElevation,
    };
  }

  return {
    shadowColor,
    shadowOpacity: ios.shadowOpacity,
    shadowRadius: ios.shadowRadius,
    shadowOffset: ios.shadowOffset,
  };
}

export const createShadows = (
  shadowColor: string,
  focusColor: string,
): ShadowScale => {
  return {
    level0: {
      elevation: 0,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      shadowColor,
    },

    level1: createDepth(
      shadowColor,
      {
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      3,
    ),

    level2: createDepth(
      shadowColor,
      {
        shadowOpacity: 0.11,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 7 },
      },
      5,
    ),

    level3: createDepth(
      shadowColor,
      {
        shadowOpacity: 0.14,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 11 },
      },
      8,
    ),

    focusRing: {
      borderWidth: 2,
      borderColor: focusColor,
      shadowColor: focusColor,
      shadowOpacity: Platform.OS === "ios" ? 0.12 : 0,
      shadowRadius: Platform.OS === "ios" ? 6 : 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
  };
};