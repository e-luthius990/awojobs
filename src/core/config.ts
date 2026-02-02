// src/core/config.ts
import Constants from "expo-constants";

type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  DEV_AUTH_BYPASS: boolean;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Env>;

export const ENV: Env = {
  SUPABASE_URL: extra.SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: extra.SUPABASE_ANON_KEY ?? "",
  DEV_AUTH_BYPASS: extra.DEV_AUTH_BYPASS ?? __DEV__, // ✅ KEY LINE
};

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  console.warn("Missing SUPABASE env vars. Check app.config.ts extra.");
}

if (ENV.DEV_AUTH_BYPASS) {
  console.warn("⚠️ DEV AUTH BYPASS ENABLED");
}
