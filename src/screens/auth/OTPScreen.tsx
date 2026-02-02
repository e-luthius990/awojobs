import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Animated,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";

import { verifyOtp, requestOtp } from "../../auth/auth.service";
import { getMyProfile } from "../../profile/profile.service";

const RESEND_SECONDS = 30;

export default function OTPScreen({ navigation, route }: any) {
  const { phoneE164 } = route.params as { phoneE164: string };

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  /* -----------------------------
     SHAKE ANIMATION
  ------------------------------ */
  const shakeX = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeX, {
        toValue: -8,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 8,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -6,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 6,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /* -----------------------------
     RESEND COUNTDOWN
  ------------------------------ */
  useEffect(() => {
    if (cooldown <= 0) return;

    const t = setInterval(() => {
      setCooldown((c) => c - 1);
    }, 1000);

    return () => clearInterval(t);
  }, [cooldown]);

  /* -----------------------------
     VERIFY OTP
  ------------------------------ */
  const onVerify = async (rawCode?: string) => {
    const finalCode = (rawCode ?? code).trim();

    if (finalCode.length !== 6 || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);

    try {
      await verifyOtp(phoneE164, finalCode);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const profile = await getMyProfile();

      if (!profile) {
        navigation.replace("CreatePin");
      } else {
        navigation.replace("Home");
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();
      setCode(""); // auto-clear

      Alert.alert("Incorrect code", "Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
     RESEND OTP
  ------------------------------ */
  const resend = async () => {
    if (cooldown > 0) return;

    try {
      await requestOtp(phoneE164, "sms");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCooldown(RESEND_SECONDS);
    } catch (e: any) {
      Alert.alert("Couldn’t resend", e?.message ?? "Try again.");
    }
  };

  /* -----------------------------
     UI
  ------------------------------ */
  return (
    <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 6 }}>
        Enter code
      </Text>

      <Text style={{ opacity: 0.75, marginBottom: 16 }}>
        We sent a code to {phoneE164}
      </Text>

      {/* OTP INPUT */}
      <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
        <TextInput
          value={code}
          onChangeText={(v) => {
            // 🔹 silent paste detection
            const clean = v.replace(/\D/g, "").slice(0, 6);
            setCode(clean);

            if (clean.length === 6) {
              onVerify(clean);
            }
          }}
          editable={!loading}
          placeholder="123456"
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={6}
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            padding: 14,
            borderRadius: 14,
            marginBottom: 14,
            letterSpacing: Platform.OS === "android" ? 8 : 10,
            fontSize: 20,
            textAlign: "center",
          }}
        />
      </Animated.View>

      {/* VERIFY */}
      <Pressable
        onPress={() => onVerify()}
        disabled={loading || code.length !== 6}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 14,
          opacity: loading ? 0.7 : 1,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontWeight: "700",
          }}
        >
          {loading ? "Verifying…" : "Verify"}
        </Text>
      </Pressable>

      {/* RESEND */}
      <Pressable onPress={resend} disabled={cooldown > 0}>
        <Text
          style={{
            textAlign: "center",
            opacity: cooldown > 0 ? 0.5 : 0.8,
            fontWeight: "600",
          }}
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </Text>
      </Pressable>
    </View>
  );
}
