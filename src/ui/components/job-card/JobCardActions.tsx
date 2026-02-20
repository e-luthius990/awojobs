import React, { useState, useMemo } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import * as Linking from "expo-linking";
import type { JobWithCoords } from "../../jobs/jobs.types";
import { normalizeUgPhone } from "@utils/normalizeUgPhone";

type Props = {
  job: JobWithCoords;
  applied: boolean;
  onApply: () => void;
};

export default function JobCardActions({ job, applied, onApply }: Props) {
  const [busy, setBusy] = useState(false);

  const expired = useMemo(
    () => new Date(job.expires_at).getTime() < Date.now(),
    [job.expires_at],
  );

  const phoneRaw = job.contact_phone
    ? normalizeUgPhone(job.contact_phone)
    : null;

  const phoneNoPlus = phoneRaw?.replace("+", "");

  const showCall = job.contact_method === "call" && !expired;

  const showWhatsApp = job.contact_method === "whatsapp" && !expired;

  const showApply = job.contact_method === "in_app" && !expired;

  async function safeOpen(url: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("App not available");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Action failed");
    }
  }

  async function callEmployer() {
    if (!phoneRaw) {
      Alert.alert("Phone number not available");
      return;
    }

    if (busy) return;
    setBusy(true);

    await safeOpen(`tel:${phoneRaw}`);

    setBusy(false);
  }

  async function whatsappEmployer() {
    if (!phoneNoPlus) {
      Alert.alert("WhatsApp number not available");
      return;
    }

    if (busy) return;
    setBusy(true);

    const msg = encodeURIComponent(
      `Hello, I saw your "${job.title}" job on AwoJobs and I’m interested.`,
    );

    await safeOpen(`https://wa.me/${phoneNoPlus}?text=${msg}`);

    setBusy(false);
  }

  if (expired) {
    return (
      <View
        style={{
          marginTop: 14,
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 999,
          backgroundColor: "#FEE2E2",
        }}
      >
        <Text
          style={{
            color: "#991B1B",
            fontWeight: "700",
          }}
        >
          Job expired
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        marginTop: 14,
      }}
    >
      {showCall && (
        <Pressable
          onPress={callEmployer}
          style={{
            backgroundColor: "#0F172A",
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontWeight: "700",
            }}
          >
            📞 Call
          </Text>
        </Pressable>
      )}

      {showWhatsApp && (
        <Pressable
          onPress={whatsappEmployer}
          style={{
            backgroundColor: "#16A34A",
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontWeight: "700",
            }}
          >
            💬 WhatsApp
          </Text>
        </Pressable>
      )}

      {showApply && !applied && (
        <Pressable
          onPress={onApply}
          style={{
            backgroundColor: "#2563EB",
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontWeight: "700",
            }}
          >
            Apply
          </Text>
        </Pressable>
      )}

      {showApply && applied && (
        <View
          style={{
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 999,
            backgroundColor: "#E5E7EB",
          }}
        >
          <Text
            style={{
              color: "#475569",
              fontWeight: "700",
            }}
          >
            Applied
          </Text>
        </View>
      )}
    </View>
  );
}
