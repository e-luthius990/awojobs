// src/core/config.ts

import Constants from "expo-constants";

/* =====================================================
   TYPES
===================================================== */

type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

/* =====================================================
   RESOLVE EXTRA (EAS + DEV CLIENT SAFE)
===================================================== */

function resolveExtra(): Partial<Env> {
  // Preferred path (Expo SDK 49+)
  if (Constants.expoConfig?.extra) {
    return Constants.expoConfig.extra as Partial<Env>;
  }

  // Fallback (certain dev builds)
  const legacy = (Constants as any)?.manifest2?.extra;
  if (legacy) {
    return legacy as Partial<Env>;
  }

  return {};
}

const rawExtra = resolveExtra();

/* =====================================================
   STRICT VALIDATION
===================================================== */

function assertEnv(value: unknown, name: keyof Env): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `[CONFIG] Missing ${name}. Verify app.config.ts and EAS environment variables.`
    );
  }

  const trimmed = value.trim();

  if (name === "SUPABASE_URL" && !/^https:\/\/.+/.test(trimmed)) {
    throw new Error(
      `[CONFIG] SUPABASE_URL must be a valid https URL.`
    );
  }

  return trimmed;
}

/* =====================================================
   FINAL ENV EXPORT (IMMUTABLE)
===================================================== */

export const ENV: Readonly<Env> = {
  SUPABASE_URL: assertEnv(rawExtra.SUPABASE_URL, "SUPABASE_URL"),
  SUPABASE_ANON_KEY: assertEnv(
    rawExtra.SUPABASE_ANON_KEY,
    "SUPABASE_ANON_KEY"
  ),
} as const;
