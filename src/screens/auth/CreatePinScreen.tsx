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
import { setPin } from "../../auth/auth.service";

type Props = {
  navigation: any;
};

export default function CreatePinScreen({ navigation }: Props) {
  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  const pinRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

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
     SAVE PIN
  ------------------------------ */
  const onSavePin = async () => {
    if (pin.length < 4 || pin.length > 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();
      setPinValue("");
      setConfirmPin("");
      pinRef.current?.focus();
      return;
    }

    if (pin !== confirmPin) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();
      setPinValue("");
      setConfirmPin("");
      pinRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      await setPin(pin);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset auth stack
      navigation.reset({
        index: 0,
        routes: [{ name: "App" }],
      });
    } catch (e: any) {
      Alert.alert("Could not save PIN", e?.message ?? "Please try again.");
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
        Create your PIN
      </Text>

      <Text style={{ opacity: 0.75, marginBottom: 20 }}>
        You’ll use this PIN to log in next time
      </Text>

      <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
        {/* PIN */}
        <TextInput
          ref={pinRef}
          value={pin}
          onChangeText={(v) => setPinValue(v.replace(/\D/g, ""))}
          placeholder="Enter PIN"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          style={input}
        />

        {/* CONFIRM PIN */}
        <TextInput
          ref={confirmRef}
          value={confirmPin}
          onChangeText={(v) => setConfirmPin(v.replace(/\D/g, ""))}
          placeholder="Confirm PIN"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          style={input}
        />
      </Animated.View>

      <Pressable
        onPress={onSavePin}
        disabled={loading || pin.length < 4 || confirmPin.length < 4}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.7 : 1,
          marginTop: 4,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontWeight: "700",
          }}
        >
          {loading ? "Saving PIN…" : "Save PIN"}
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
  fontSize: 20,
  textAlign: "center",
};
