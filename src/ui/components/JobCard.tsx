import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import * as Linking from "expo-linking";
import { Job } from "../../jobs/jobs.types";

/* ---------------------------------------------
   HELPERS
---------------------------------------------- */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceLabel(km: number) {
  if (km <= 1) return "Very near";
  if (km <= 3) return "Nearby";
  if (km <= 7) return "In your area";
  return "Far";
}

/* ---------------------------------------------
   CATEGORY COLORS
---------------------------------------------- */
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Construction: { bg: "#F3ECE6", text: "#6B3F26" },
  Retail: { bg: "#E9F3EF", text: "#1F5E43" },
  Hospitality: { bg: "#EAF2FA", text: "#1F4E79" },
  Transport: { bg: "#F6F2E8", text: "#5A4A1F" },
  Cleaning: { bg: "#F1F3F5", text: "#374151" },
  Default: { bg: "#F3F4F6", text: "#374151" },
};

type Props = {
  job: Job;
  userCoords?: { lat: number; lng: number };
};

export function JobCard({ job, userCoords }: Props) {
  const expiresAt = new Date(job.expires_at);
  const isToday = expiresAt.toDateString() === new Date().toDateString();

  const category = (job as any).category;
  const categoryStyle = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Default;

  const distance = useMemo(() => {
    if (!userCoords || !job.lat || !job.lng) return null;
    const km = distanceKm(userCoords.lat, userCoords.lng, job.lat, job.lng);
    return `${distanceLabel(km)} · ${km.toFixed(1)} km`;
  }, [userCoords, job.lat, job.lng]);

  function contact() {
    const phone = job.contact_phone?.replace("+", "");
    if (job.contact_method === "call") {
      Linking.openURL(`tel:${job.contact_phone}`);
    }
    if (job.contact_method === "whatsapp") {
      const msg = encodeURIComponent(
        `Hello, I saw your job "${job.title}" on AwoJobs.`,
      );
      Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
    }
  }

  const actionLabel =
    job.contact_method === "walk_in"
      ? "Walk in"
      : job.contact_method === "call"
        ? "Call"
        : "WhatsApp";

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      {/* SOFT CATEGORY WASH */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          backgroundColor: categoryStyle.bg,
          opacity: 0.35,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      />

      {/* HEADER */}
      <Text
        style={{
          fontSize: 17,
          fontWeight: "800",
          color: "#0F172A",
        }}
        numberOfLines={2}
      >
        {job.title}
      </Text>

      {/* META */}
      <View style={{ marginTop: 6 }}>
        {distance && (
          <Text style={{ fontSize: 13, color: "#475569" }}>📍 {distance}</Text>
        )}

        <Text style={{ fontSize: 13, marginTop: 4 }}>
          Pay: <Text style={{ fontWeight: "700" }}>{job.pay_type}</Text>
          {isToday && (
            <Text style={{ color: "#B91C1C", fontWeight: "700" }}>
              {" "}
              • Today
            </Text>
          )}
        </Text>

        <Text style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
          Expires {expiresAt.toLocaleDateString()}
        </Text>
      </View>

      {/* ACTION */}
      {job.contact_method !== "walk_in" ? (
        <Pressable
          onPress={contact}
          style={{
            marginTop: 14,
            alignSelf: "flex-start",
            backgroundColor: "#0F172A",
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : (
        <Text
          style={{
            marginTop: 14,
            fontSize: 13,
            color: "#475569",
            fontWeight: "600",
          }}
        >
          Walk in to apply
        </Text>
      )}
    </View>
  );
}
