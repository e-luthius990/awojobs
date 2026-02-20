import React, { useMemo } from "react";
import { View, Text } from "react-native";
import type { JobWithCoords } from "../../jobs/jobs.types";

function getTrustBadges(job: JobWithCoords) {
  const badges: { label: string; color: string }[] = [];

  /* Phone reachable */
  if (job.contact_phone) {
    badges.push({
      label: "🟢 Phone reachable",
      color: "#16A34A",
    });
  }

  /* New post (7 days) */
  const createdAt = new Date(job.created_at).getTime();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  if (createdAt >= sevenDaysAgo) {
    badges.push({
      label: "🆕 New post",
      color: "#2563EB",
    });
  }

  /* Employer verified (if exists in schema) */
  if (job.employer_verified === true) {
    badges.push({
      label: "✔ Verified employer",
      color: "#0F766E",
    });
  }

  return badges;
}

export default function JobCardTrustBadges({ job }: { job: JobWithCoords }) {
  const trustBadges = useMemo(
    () => getTrustBadges(job),
    [job.contact_phone, job.created_at, job.employer_verified],
  );

  if (!trustBadges.length) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 8,
      }}
    >
      {trustBadges.map((b, i) => (
        <View
          key={i}
          style={{
            backgroundColor: "#F8FAFC",
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: b.color,
            }}
          >
            {b.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
