import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { Profile } from "../state/useProfile";

const SUPPORT_WHATSAPP = "+256700000000"; // ← replace

function encode(text: string) {
  return encodeURIComponent(text);
}

export function openWhatsAppSupport(profile: Profile | null) {
  const appVersion =
    Constants.expoConfig?.version ?? "unknown";

  const message = `
Hello AwoJobs support, I’m having a problem.

Phone: ${profile?.phone_number ?? "unknown"}
Account type: ${profile?.role ?? "unknown"}
App: v${appVersion} (${Platform.OS})

Problem:
`;

  const url = `https://wa.me/${SUPPORT_WHATSAPP.replace(
    "+",
    ""
  )}?text=${encode(message)}`;

  Linking.openURL(url);
}
