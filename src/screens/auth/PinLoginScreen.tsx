import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";

import { loginWithPin, requestOtp } from "../../auth/auth.service";

type Props = {
  navigation: any;
  route: {
    params: {
      phoneE164: string;
    };
  };
};

export default function PinLoginScreen({ navigation, route }: Props) {
  const { phoneE164 } = route.params;

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  // 🎯 shake animation value
  const shakeX = useRef(new Animated.Value(0)).current;

  /* =====================================================
     SHAKE ANIMATION (SUBTLE)
  ====================================================== */
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

  /* =====================================================
     LOGIN WITH PIN
  ====================================================== */
  const onLogin = async () => {
    if (pin.length < 4) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      triggerShake();
      setPin(""); // 🔹 auto-clear
      Alert.alert("Enter PIN", "Please enter your PIN to continue.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);

    try {
      await loginWithPin(phoneE164, pin);

      // ✅ success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // RootNavigator will auto-switch to App
    } catch (e: any) {
      const status = e?.status || e?.response?.status;

      if (status === 429) {
        // ⚠️ rate-limited → do NOT clear PIN
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Too many attempts",
          "Your PIN is temporarily locked. Please wait before trying again or use SMS instead.",
        );
      } else {
        // ❌ wrong PIN → shake + haptic + clear
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        triggerShake();
        setPin(""); // 🔹 auto-clear on wrong attempt
        Alert.alert("Login failed", "Incorrect PIN. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     FALLBACK TO OTP
  ====================================================== */
  const useOtpInstead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setFallbackLoading(true);
    try {
      await requestOtp(phoneE164, "sms");
      navigation.replace("OTP", { phoneE164 });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Couldn’t send code", e?.message ?? "Try again.");
    } finally {
      setFallbackLoading(false);
    }
  };

  /* =====================================================
     UI
  ====================================================== */
  return (
    <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 6 }}>
        Welcome back
      </Text>

      <Text style={{ opacity: 0.75, marginBottom: 20 }}>
        Enter your PIN to continue
      </Text>

      {/* 🔐 PIN INPUT (SHAKES & CLEARS ON ERROR) */}
      <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
        <TextInput
          value={pin}
          onChangeText={setPin}
          placeholder="••••"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            padding: 14,
            borderRadius: 14,
            marginBottom: 16,
            letterSpacing: 12,
            fontSize: 20,
            textAlign: "center",
          }}
        />
      </Animated.View>

      <Pressable
        onPress={onLogin}
        disabled={loading || pin.length < 4}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 14,
          opacity: loading ? 0.7 : 1,
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontWeight: "700",
          }}
        >
          {loading ? "Logging in…" : "Login"}
        </Text>
      </Pressable>

      <Pressable onPress={useOtpInstead} disabled={fallbackLoading}>
        <Text style={{ textAlign: "center", opacity: 0.8 }}>
          {fallbackLoading ? "Sending code…" : "Forgot PIN? Use SMS instead"}
        </Text>
      </Pressable>
    </View>
  );
}
