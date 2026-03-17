// src/notifications/registerForPushNotifications.ts

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "../core/supabase";

/* =====================================================
   REGISTER DEVICE PUSH TOKEN (DIRECT RLS UPSERT)
===================================================== */

export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) return;

    const { status } = await Notifications.getPermissionsAsync();

    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") return;
    }

    const pushTokenResponse =
      await Notifications.getExpoPushTokenAsync({ projectId });

    const token = pushTokenResponse?.data;
    if (!token) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) return;

    // Get authoritative location from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("location_id")
      .eq("id", session.user.id)
      .single();

    if (!profile?.location_id) return;

    await supabase
      .from("device_push_tokens")
      .upsert(
        {
          expo_push_token: token,
          user_id: session.user.id,
          location_id: profile.location_id,
          push_opt_in: true,
        },
        { onConflict: "expo_push_token" }
      );

  } catch (err) {
    if (__DEV__) {
      console.warn("[Push] registration failed");
    }
  }
}