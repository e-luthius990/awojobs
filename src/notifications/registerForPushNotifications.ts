import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "../core/supabase";
import { ENV } from "../core/config";
import { getDeviceHash } from "../security/device";

export async function registerForPushNotifications(
  locationId?: string
) {
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

  const device_hash = await getDeviceHash().catch(() => null);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return;

  const res = await fetch(
    `${ENV.SUPABASE_URL}/functions/v1/register_device_push`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        expo_push_token: token,
        location_id: locationId ?? null,
        platform: Platform.OS,
        device_hash,
      }),
    }
  );

  if (!res.ok && __DEV__) {
    console.warn("[Push Edge] register_device_push failed");
  }
}
