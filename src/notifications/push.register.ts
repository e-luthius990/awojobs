import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { supabase } from "../core/supabase";

export async function registerForPushNotifications() {
  if (!Device.isDevice) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    if (req.status !== "granted") return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  await supabase.from("profiles").update({
    expo_push_token: token,
  });
}
