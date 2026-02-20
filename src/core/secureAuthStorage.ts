// src/core/secureAuthStorage.ts

import * as SecureStore from "expo-secure-store";
import { SupabaseClientOptions } from "@supabase/supabase-js";
import { Platform } from "react-native";

/* =====================================================
   PREFIX
===================================================== */

const PREFIX = "awojobs_auth_";

/* =====================================================
   SAFE WRAPPERS
===================================================== */

async function safeGet(key: string): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(PREFIX + key);
    return value ?? null;
  } catch {
    return null; // silent fail-safe
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PREFIX + key, value, {
      keychainAccessible:
        SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  } catch {
    // Silent fail – do not break auth flow
  }
}

async function safeRemove(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PREFIX + key);
  } catch {
    // Silent fail
  }
}

/* =====================================================
   STORAGE ADAPTER
===================================================== */

const storage: SupabaseClientOptions["auth"]["storage"] =
  Platform.OS === "web"
    ? {
        getItem: (key: string) =>
          Promise.resolve(
            window.localStorage.getItem(PREFIX + key)
          ),
        setItem: (key: string, value: string) => {
          window.localStorage.setItem(PREFIX + key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          window.localStorage.removeItem(PREFIX + key);
          return Promise.resolve();
        },
      }
    : {
        getItem: safeGet,
        setItem: safeSet,
        removeItem: safeRemove,
      };

export const secureAuthStorage = storage;
