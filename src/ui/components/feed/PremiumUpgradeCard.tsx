import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onPress: () => void;
};

export default function PremiumUpgradeCard({ onPress }: Props) {
  return (
    <LinearGradient
      colors={["#111827", "#1F2937"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* PRO Badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>PRO</Text>
      </View>

      {/* Title Row */}
      <View style={styles.titleRow}>
        <Ionicons
          name="globe-outline"
          size={18}
          color="#22C55E"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.title}>Unlock Nationwide Jobs</Text>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        View job opportunities across all districts in Uganda.
      </Text>

      {/* CTA */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>Upgrade Now</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 18,
    borderRadius: 18,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },

  badgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 16,
  },

  subtitle: {
    color: "#CBD5E1",
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },

  button: {
    marginTop: 14,
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
