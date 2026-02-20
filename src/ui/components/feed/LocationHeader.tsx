import React from "react";
import { View, Text, Pressable } from "react-native";

type Props = {
  locationLabel: string | null;
  scope: "district" | "national";
  isPremium: boolean;
  onToggleScope?: () => void;
};

export default function LocationHeader({
  locationLabel,
  scope,
  isPremium,
  onToggleScope,
}: Props) {
  const isNational = scope === "national";

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 12,
              color: "#94A3B8",
              fontWeight: "600",
            }}
          >
            YOUR LOCATION
          </Text>

          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#0F172A",
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            📍 {locationLabel ?? "Unknown area"}
          </Text>
        </View>

        {isPremium && onToggleScope && (
          <Pressable
            onPress={onToggleScope}
            style={{
              backgroundColor: "#EEF2FF",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#1E3A8A",
              }}
            >
              {isNational ? "Nationwide" : "Local"}
            </Text>
          </Pressable>
        )}
      </View>

      <Text
        style={{
          fontSize: 24,
          fontWeight: "900",
          color: "#0F172A",
          marginTop: 18,
        }}
      >
        {isNational ? "Jobs across Uganda" : "Jobs in your area"}
      </Text>
    </View>
  );
}
