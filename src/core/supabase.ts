import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./config";
import { secureAuthStorage } from "./secureAuthStorage";

declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_CLIENT__: SupabaseClient | undefined;
}

function assertEnv(name: string, value: string | undefined): string {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`[supabase] Missing required env: ${name}`);
  }

  return value.trim();
}

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = assertEnv("SUPABASE_URL", ENV.SUPABASE_URL);
  const supabaseAnonKey = assertEnv("SUPABASE_ANON_KEY", ENV.SUPABASE_ANON_KEY);

  if (!/^https:\/\/.+/i.test(supabaseUrl)) {
    throw new Error("[supabase] SUPABASE_URL must be a valid https URL");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        "X-Client-Info": "awojobs-mobile",
      },
    },
    auth: {
      storage: secureAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      multiTab: false,
      storageKey: "awojobs-auth",
    },
    db: {
      schema: "public",
    },
    realtime: {
      params: {
        eventsPerSecond: 3,
      },
    },
  });
}

export const supabase: SupabaseClient =
  global.__SUPABASE_CLIENT__ ?? createSupabaseClient();

if (!global.__SUPABASE_CLIENT__) {
  global.__SUPABASE_CLIENT__ = supabase;
}