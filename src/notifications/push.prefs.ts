// src/notifications/push.prefs.ts

import * as Notifications from "expo-notifications";
import { supabase } from "../core/supabase";

/* =====================================================
   SET PUSH OPT-IN (RPC VERSION)
===================================================== */

export async function setPushOptIn(enabled: boolean) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated.");
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Notification permission not granted.");
  }

  const pushTokenResponse =
    await Notifications.getExpoPushTokenAsync();

  const token = pushTokenResponse?.data;

  if (!token) {
    throw new Error("Unable to obtain push token.");
  }

  const { error } = await supabase.rpc("set_push_pref", {
    p_expo_push_token: token,
    p_push_opt_in: enabled,
  });

  if (error) {
    if (__DEV__) {
      console.warn("[Push RPC] Failed");
    }
    throw new Error("Failed to update notification preference.");
  }
}
