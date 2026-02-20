import React, { useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import * as Haptics from "expo-haptics";

import { useSession } from "../../state/useSession";
import { setPendingIntent } from "../../intent/intent.store";

export default function ChangePinScreen({ navigation }: any) {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);

  async function startPinChange() {
    if (loading) return;
    setLoading(true);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const resumePinChange = async () => {
      // After OTP success, user continues PIN flow
      navigation.navigate("CreatePin");
    };

    Alert.alert(
      "Change PIN",
      "For your security, you’ll need to verify your phone number again before setting a new PIN.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setLoading(false),
        },
        {
          text: "Continue",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );

            // 🔐 Intent-based verification
            setPendingIntent({
              type: "CHANGE_PIN",
              resume: resumePinChange,
            });

            // If already authenticated, OTP still enforces step-up
            navigation.navigate("AuthModal");

            setLoading(false);
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* HEADER */}
      <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 8 }}>
        Change PIN
      </Text>

      <Text style={{ opacity: 0.75, marginBottom: 24, lineHeight: 20 }}>
        To protect your account, changing your PIN requires phone verification.
        You’ll receive a one-time code to confirm it’s you.
      </Text>

      {/* ACTION */}
      <Pressable
        onPress={startPinChange}
        disabled={loading}
        style={{
          backgroundColor: "#111",
          paddingVertical: 14,
          borderRadius: 14,
          opacity: loading ? 0.7 : 1,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontWeight: "700",
            fontSize: 15,
          }}
        >
          {loading ? "Preparing verification…" : "Verify phone & change PIN"}
        </Text>
      </Pressable>
    </View>
  );
}
