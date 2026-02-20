// src/core/supabase.ts

import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./config";
import { secureAuthStorage } from "./secureAuthStorage";

/* =====================================================
   SINGLETON PROTECTION (FAST REFRESH SAFE)
===================================================== */

declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_CLIENT__: SupabaseClient | undefined;
}

/* =====================================================
   CLIENT FACTORY
===================================================== */

function createSupabaseClient(): SupabaseClient {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
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

/* =====================================================
   ENSURE SINGLE INSTANCE
===================================================== */

export const supabase: SupabaseClient =
  global.__SUPABASE_CLIENT__ ?? createSupabaseClient();

if (!global.__SUPABASE_CLIENT__) {
  global.__SUPABASE_CLIENT__ = supabase;
}
