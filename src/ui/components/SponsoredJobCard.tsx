import React from "react";
import { View, Text } from "react-native";
import { Job } from "../../jobs/jobs.types";
import { JobCard } from "./JobCard";

type Props = {
  job: Job;
  userCoords?: { lat: number; lng: number };
};

export function SponsoredJobCard({ job, userCoords }: Props) {
  return (
    <View
      style={{
        position: "relative",
        marginBottom: 16,
      }}
    >
      {/* SOFT SPONSORED AURA */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 6,
          left: 6,
          right: 6,
          bottom: -6,
          backgroundColor: "#FEF3C7", // warm gold tint
          opacity: 0.45,
          borderRadius: 22,
        }}
      />

      {/* QUIET LABEL */}
      <Text
        style={{
          position: "absolute",
          top: 10,
          right: 14,
          fontSize: 11,
          fontWeight: "700",
          color: "#92400E",
          zIndex: 10,
        }}
      >
        Sponsored
      </Text>

      {/* BASE CARD */}
      <JobCard job={job} userCoords={userCoords} />
    </View>
  );
}
