import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";

import { normalizeUgPhone } from "../../auth/phone";
import { requestOtp } from "../../auth/auth.service";
import { supabase } from "../../core/supabase";

/* ---------------------------------------------
   PHONE FORMATTER (DISPLAY ONLY)
---------------------------------------------- */
function formatUgPhone(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;

  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export default function WelcomeScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const onContinue = async () => {
    const phoneE164 = normalizeUgPhone(phone);
    if (!phoneE164) {
      // ⚠️ validation feedback (soft)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Invalid number", "Enter a valid Ugandan phone number.");
      return;
    }

    // 👆 tap confirmation (very subtle)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("pin_hash")
        .eq("phone_number", phoneE164)
        .maybeSingle();

      if (error) throw error;

      // ✅ success confirmation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (profile?.pin_hash) {
        navigation.navigate("PinLogin", { phoneE164 });
        return;
      }

      await requestOtp(phoneE164);
      navigation.navigate("OTP", { phoneE164 });
    } catch (e: any) {
      // ❌ error feedback (gentle warning)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Couldn’t continue", e?.message ?? "Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: "#F8F9FB" }}
    >
      <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        {/* INTRO */}
        <Text style={{ fontSize: 28, fontWeight: "900", marginBottom: 6 }}>
          Find work near you
        </Text>

        <Text
          style={{
            fontSize: 15,
            opacity: 0.7,
            marginBottom: 28,
            lineHeight: 22,
          }}
        >
          Get notified when jobs are posted around your area.
          {"\n"}Fast. Local. No CV required.
        </Text>

        {/* PHONE INPUT */}
        <View style={{ marginBottom: 18 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              marginBottom: 6,
              opacity: 0.7,
            }}
          >
            Phone number (Uganda)
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "#e5e5e5",
              borderRadius: 14,
              paddingHorizontal: 14,
            }}
          >
            {/* 🇺🇬 FLAG */}
            <Text style={{ fontSize: 20, marginRight: 8 }}>🇺🇬</Text>

            <TextInput
              value={phone}
              onChangeText={(v) => setPhone(formatUgPhone(v))}
              placeholder="0700 000 000"
              keyboardType="phone-pad"
              autoComplete="tel"
              style={{
                flex: 1,
                paddingVertical: 14,
                fontSize: 16,
              }}
            />
          </View>
        </View>

        {/* CTA */}
        <Pressable
          onPress={onContinue}
          disabled={loading || phone.replace(/\D/g, "").length < 9}
          style={{
            backgroundColor: "#111",
            paddingVertical: 16,
            borderRadius: 999,
            opacity: loading ? 0.75 : 1,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text
              style={{
                color: "white",
                fontSize: 16,
                fontWeight: "800",
              }}
            >
              Continue
            </Text>
          )}
        </Pressable>

        {/* TRUST */}
        <Text
          style={{
            marginTop: 18,
            fontSize: 12,
            opacity: 0.6,
            textAlign: "center",
          }}
        >
          We’ll never post without your permission.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
