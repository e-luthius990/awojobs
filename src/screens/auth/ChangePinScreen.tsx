import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { loginWithPin, setPin } from "../../auth/auth.service";
import { supabase } from "../../core/supabase";

type Props = {
  navigation: any;
};

export default function ChangePinScreen({ navigation }: Props) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  const currentRef = useRef<TextInput>(null);

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

  const resetPins = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    currentRef.current?.focus();
  };

  /* -----------------------------
     CHANGE PIN
  ------------------------------ */
  const onChangePin = async () => {
    if (newPin.length < 4 || newPin.length > 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();
      resetPins();
      return;
    }

    if (newPin !== confirmPin) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();
      resetPins();
      return;
    }

    setLoading(true);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user?.phone) {
        throw new Error("Session expired. Please log in again.");
      }

      // 1️⃣ Verify current PIN
      await loginWithPin(session.user.phone, currentPin);

      // 2️⃣ Set new PIN
      await setPin(newPin);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert("PIN updated", "Your PIN has been changed successfully.");
      navigation.goBack();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();
      resetPins();

      // Only show alert if it’s not a simple mismatch
      if (e?.message?.includes("Session")) {
        Alert.alert("Session expired", "Please log in again.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
     UI
  ------------------------------ */
  return (
    <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 6 }}>
        Change PIN
      </Text>

      <Text style={{ opacity: 0.75, marginBottom: 20 }}>
        Enter your current PIN, then choose a new one
      </Text>

      <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
        {/* CURRENT PIN */}
        <TextInput
          ref={currentRef}
          value={currentPin}
          onChangeText={(v) => setCurrentPin(v.replace(/\D/g, ""))}
          placeholder="Current PIN"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          style={input}
        />

        {/* NEW PIN */}
        <TextInput
          value={newPin}
          onChangeText={(v) => setNewPin(v.replace(/\D/g, ""))}
          placeholder="New PIN"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          style={input}
        />

        {/* CONFIRM PIN */}
        <TextInput
          value={confirmPin}
          onChangeText={(v) => setConfirmPin(v.replace(/\D/g, ""))}
          placeholder="Confirm new PIN"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          style={[input, { marginBottom: 20 }]}
        />
      </Animated.View>

      <Pressable
        onPress={onChangePin}
        disabled={
          loading ||
          currentPin.length < 4 ||
          newPin.length < 4 ||
          confirmPin.length < 4
        }
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.7 : 1,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontWeight: "700",
          }}
        >
          {loading ? "Updating PIN…" : "Update PIN"}
        </Text>
      </Pressable>
    </View>
  );
}

/* -----------------------------
   STYLES
------------------------------ */
const input = {
  borderWidth: 1,
  borderColor: "#ddd",
  padding: 14,
  borderRadius: 12,
  marginBottom: 12,
  letterSpacing: 12,
  fontSize: 18,
  textAlign: "center",
};
