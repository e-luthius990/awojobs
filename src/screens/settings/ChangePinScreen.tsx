import React, { useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../../core/supabase";

export default function ChangePinScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);

  async function resetPin() {
    if (loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Alert.alert(
      "Change PIN",
      "For your security, you’ll need to verify your phone number again before setting a new PIN.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              // Success haptic before exit
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );

              // Sign out → OTP flow will start automatically
              await supabase.auth.signOut();
            } catch {
              Alert.alert("Something went wrong", "Please try again.");
            } finally {
              setLoading(false);
            }
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
        onPress={resetPin}
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
