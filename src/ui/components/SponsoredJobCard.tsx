import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { JobWithCoords } from "../../jobs/jobs.types";
import { JobCard } from "./JobCard";

type Props = {
  job: JobWithCoords;
  userCoords?: { lat: number; lng: number };
};

export function SponsoredJobCard({ job, userCoords }: Props) {
  const sponsorStyle = useMemo(() => {
    if (!job.is_sponsored) return null;
    if (!job.sponsored_until) return null;

    const active = new Date(job.sponsored_until).getTime() > Date.now();

    if (!active) return null;

    switch (job.sponsor_tier) {
      case "national":
        return {
          borderColor: "#2563EB",
          label: "Sponsored • Nationwide",
          labelColor: "#1E3A8A",
        };

      case "regional":
        return {
          borderColor: "#EA580C",
          label: "Sponsored • Regional",
          labelColor: "#9A3412",
        };

      case "district":
      default:
        return {
          borderColor: "#F59E0B",
          label: "Sponsored",
          labelColor: "#92400E",
        };
    }
  }, [job.is_sponsored, job.sponsor_tier, job.sponsored_until]);

  if (!sponsorStyle) {
    return <JobCard job={job} userCoords={userCoords} />;
  }

  return (
    <View
      style={{
        marginBottom: 16,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: sponsorStyle.borderColor,
      }}
    >
      <View style={{ paddingTop: 6, paddingHorizontal: 14 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "800",
            color: sponsorStyle.labelColor,
          }}
        >
          {sponsorStyle.label}
        </Text>
      </View>

      <JobCard job={job} userCoords={userCoords} />
    </View>
  );
}
