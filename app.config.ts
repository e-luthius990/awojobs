import "dotenv/config";
import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "AwoJobs",
  slug: "awojobs",
  scheme: "awojobs",
  version: "1.0.0",

  orientation: "portrait",
  icon: "./assets/icon.png",

  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#F7F9FC",
  },

  android: {
    package: "com.awojobs.app",
    googleServicesFile: "./google-services.json",
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#F7F9FC",
    },
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
  },

  plugins: [
    "expo-font",
    "expo-secure-store",
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#0F172A",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "AwoJobs uses your current device location to show jobs near your area.",
      },
    ],
  ],

  updates: {
    enabled: false,
  },

  runtimeVersion: {
    policy: "appVersion",
  },

  extra: {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    eas: {
      projectId: "3381d51f-b9a7-4ae7-a442-77f7e9986e1d",
    },
  },

  assetBundlePatterns: ["**/*"],
};

export default config;