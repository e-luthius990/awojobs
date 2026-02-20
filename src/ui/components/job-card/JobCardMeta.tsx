import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { JobWithCoords } from "../../jobs/jobs.types";

type Props = {
  job: JobWithCoords;
  showLocation?: boolean;
};

export default function JobCardMeta({ job, showLocation = true }: Props) {
  const createdDate = useMemo(() => new Date(job.created_at), [job.created_at]);

  const expiresDate = useMemo(() => new Date(job.expires_at), [job.expires_at]);

  const isToday = useMemo(() => {
    const now = new Date();
    return createdDate.toDateString() === now.toDateString();
  }, [createdDate]);

  const locationLabel = useMemo(() => {
    if (!showLocation) return null;

    if (!job.sub_county || !job.district) return null;

    return `${job.sub_county}, ${job.district}`;
  }, [job.sub_county, job.district, showLocation]);

  return (
    <View style={styles.container}>
      {/* Location */}
      {locationLabel && <Text style={styles.location}>📍 {locationLabel}</Text>}

      {/* Pay + Today */}
      <Text style={styles.payLine}>
        Pay: <Text style={styles.payValue}>{job.pay_type}</Text>
        {isToday && <Text style={styles.todayBadge}> • Today</Text>}
      </Text>

      {/* Expiry */}
      <Text style={styles.expiry}>
        Expires {expiresDate.toLocaleDateString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  location: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  payLine: {
    fontSize: 13,
    color: "#0F172A",
  },
  payValue: {
    fontWeight: "700",
  },
  todayBadge: {
    color: "#DC2626",
    fontWeight: "800",
  },
  expiry: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
});
