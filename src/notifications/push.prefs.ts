// src/notifications/push.prefs.ts

import * as Notifications from "expo-notifications";
import { supabase } from "../core/supabase";

/* =====================================================
   SET PUSH OPT-IN (DIRECT UPDATE)
===================================================== */

export async function setPushOptIn(enabled: boolean) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
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

  const { error } = await supabase
    .from("device_push_tokens")
    .update({ push_opt_in: enabled })
    .eq("expo_push_token", token)
    .eq("user_id", session.user.id);

  if (error) {
    if (__DEV__) {
      console.warn("[Push] Failed to update preference");
    }
    throw new Error("Failed to update notification preference.");
  }
}