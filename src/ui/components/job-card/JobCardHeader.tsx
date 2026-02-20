import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { JobWithCoords } from "../../jobs/jobs.types";

type Props = {
  job: JobWithCoords;
  saved: boolean;
  applied: boolean;
  onToggleSave: () => Promise<void> | void;
  isSponsored?: boolean;
  isPremium?: boolean;
};

export default function JobCardHeader({
  job,
  saved,
  applied,
  onToggleSave,
  isSponsored = false,
  isPremium = false,
}: Props) {
  const [busy, setBusy] = useState(false);

  const sponsorActive = useMemo(() => {
    if (!isSponsored) return false;
    if (!job.sponsored_until) return false;
    return new Date(job.sponsored_until).getTime() > Date.now();
  }, [isSponsored, job.sponsored_until]);

  async function handleToggleSave() {
    if (busy) return;
    setBusy(true);
    await onToggleSave();
    setBusy(false);
  }

  return (
    <View style={styles.wrapper}>
      {/* Save Button */}
      <Pressable
        onPress={handleToggleSave}
        disabled={busy}
        style={({ pressed }) => [
          styles.saveBtn,
          busy && { opacity: 0.6 },
          pressed && { opacity: 0.75 },
        ]}
      >
        <Text style={styles.saveIcon}>{saved ? "⭐" : "☆"}</Text>
      </Pressable>

      {/* Sponsored Badge (Highest Priority) */}
      {sponsorActive && (
        <View style={styles.sponsoredBadge}>
          <Text style={styles.sponsoredText}>🔥 Sponsored</Text>
        </View>
      )}

      {/* Premium National Indicator (Subtle) */}
      {isPremium && !sponsorActive && (
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumText}>🌍 National</Text>
        </View>
      )}

      {/* Job Title */}
      <Text style={[styles.title, isPremium && styles.premiumTitle]}>
        {job.title}
      </Text>

      {/* Applied Badge */}
      {applied && (
        <View style={styles.appliedBadge}>
          <Text style={styles.appliedText}>✓ Applied</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingRight: 40,
  },

  saveBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 10,
  },

  saveIcon: {
    fontSize: 18,
  },

  /* Sponsored – Strongest */
  sponsoredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F59E0B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },

  sponsoredText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  /* Premium – Subtle */
  premiumBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },

  premiumText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#3730A3",
  },

  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  premiumTitle: {
    fontSize: 18,
    fontWeight: "900",
  },

  appliedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#22C55E",
  },

  appliedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#166534",
  },
});
