import React from "react";
import { View, Text, Pressable } from "react-native";

type Props = {
  locationLabel: string | null;
  isPremium: boolean;
  scope: "district" | "national";
  onUpgrade?: () => void;
};

export default function EmptyFeedState({
  locationLabel,
  isPremium,
  scope,
  onUpgrade,
}: Props) {
  const isNational = scope === "national";

  const title = isNational
    ? "No active jobs across Uganda"
    : `No jobs in ${locationLabel ?? "this area"} yet`;

  const subtitle = isNational
    ? "Check back soon as employers post new opportunities."
    : "Employers nearby haven’t posted any jobs yet.";

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 36,
      }}
    >
      {/* Title */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: "800",
          color: "#0F172A",
          textAlign: "center",
        }}
      >
        {title}
      </Text>

      {/* Subtitle */}
      <Text
        style={{
          fontSize: 14,
          color: "#64748B",
          marginTop: 10,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        {subtitle}
      </Text>

      {/* Premium Upgrade CTA */}
      {!isPremium && (
        <Pressable
          onPress={onUpgrade}
          style={{
            marginTop: 26,
            backgroundColor: "#0F172A",
            paddingHorizontal: 28,
            paddingVertical: 14,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: "#FFF",
              fontWeight: "700",
              fontSize: 14,
            }}
          >
            View jobs nationwide
          </Text>
        </Pressable>
      )}

      {/* Premium subtle helper */}
      {isPremium && !isNational && (
        <Text
          style={{
            marginTop: 24,
            fontSize: 13,
            color: "#94A3B8",
            textAlign: "center",
          }}
        >
          Try switching to nationwide view.
        </Text>
      )}
    </View>
  );
}
