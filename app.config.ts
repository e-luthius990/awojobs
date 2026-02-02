import "dotenv/config";
import { ExpoConfig } from "expo/config";

const isDev = process.env.NODE_ENV === "development";

const config: ExpoConfig = {
  name: "AwoJobs",
  slug: "awojobs",
  scheme: "awojobs",

  sdkVersion: "55.0.0",
  version: "1.0.0",

  orientation: "portrait",
  icon: "./assets/icon.png",

  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0F172A",
  },

  android: {
    package: "com.awojobs.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0F172A",
    },
  },

  // OTA: disabled in dev, safe in prod
  updates: {
    enabled: !isDev,
    fallbackToCacheTimeout: 30000,
  },

  runtimeVersion: {
    policy: "sdkVersion",
  },

  extra: {
    eas: {
      projectId: "dd275612-2a11-4eda-b0e7-f3648e69f039",
    },

    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,

    DEV_AUTH_BYPASS: isDev,
  },

  assetBundlePatterns: ["**/*"],
};

export default config;
