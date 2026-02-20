// src/core/supabaseAnon.ts

import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./config";

/* =====================================================
   GLOBAL SINGLETON (FAST REFRESH SAFE)
===================================================== */

declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_ANON_CLIENT__: SupabaseClient | undefined;
}

/* =====================================================
   CLIENT FACTORY
===================================================== */

function createAnonClient(): SupabaseClient {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        "X-Client-Info": "awojobs-mobile-anon",
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: undefined,
      multiTab: false,
    },
    db: {
      schema: "public",
    },
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
    },
  });
}

/* =====================================================
   ENSURE SINGLE INSTANCE
===================================================== */

export const supabaseAnon: SupabaseClient =
  global.__SUPABASE_ANON_CLIENT__ ?? createAnonClient();

if (!global.__SUPABASE_ANON_CLIENT__) {
  global.__SUPABASE_ANON_CLIENT__ = supabaseAnon;
}
