import React from "react";
import { View, Text } from "react-native";

type SponsorTier = "district" | "national";

type Props = {
  tier?: SponsorTier | null;
};

const BADGE_CONFIG: Record<
  SponsorTier,
  { label: string; bg: string; text: string }
> = {
  district: {
    label: "Sponsored",
    bg: "#FEF3C7",
    text: "#92400E",
  },
  national: {
    label: "National Sponsor",
    bg: "#DBEAFE",
    text: "#1E3A8A",
  },
};

export default function SponsorBadge({ tier }: Props) {
  if (!tier) return null;

  const config = BADGE_CONFIG[tier];
  if (!config) return null;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: config.bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        marginBottom: 6,
      }}
    >
      <Text
        style={{
          color: config.text,
          fontSize: 11,
          fontWeight: "700",
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}
