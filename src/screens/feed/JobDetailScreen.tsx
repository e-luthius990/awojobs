import React from "react";
import { View, Text, Pressable, Alert, Share } from "react-native";
import * as Linking from "expo-linking";
import { Job } from "../../jobs/jobs.types";

/* ---------------------------------------------
   SHARE TEXT BUILDER
---------------------------------------------- */
function buildShareText(job: Job) {
  const expiresAt = new Date(job.expires_at).toLocaleDateString();

  const contactLine =
    job.contact_method === "walk_in"
      ? "Apply: Walk-in"
      : `Contact: ${job.contact_method.toUpperCase()} • ${job.contact_phone}`;

  const description = job.description ? `\n\nDetails:\n${job.description}` : "";

  const url = `https://awojobs.app/job/${job.id}`;

  return (
    `Job opportunity on AwoJobs\n\n` +
    `${job.title}\n` +
    `Pay: ${job.pay_type}\n` +
    `${contactLine}\n` +
    `Expires: ${expiresAt}` +
    `${description}\n\n` +
    `View job: ${url}`
  );
}

/* ---------------------------------------------
   SCREEN
---------------------------------------------- */
export default function JobDetailScreen({ route }: any) {
  const { job } = route.params as { job: Job };

  const expiresAt = new Date(job.expires_at);
  const now = new Date();

  const isToday = expiresAt.toDateString() === now.toDateString();
  const isExpired = expiresAt < now;

  /* ---------------------------------------------
     SHARE
  ---------------------------------------------- */
  async function shareJob() {
    try {
      await Share.share({
        message: buildShareText(job),
      });
    } catch {
      Alert.alert("Couldn’t share", "Please try again.");
    }
  }

  /* ---------------------------------------------
     CONTACT EMPLOYER
  ---------------------------------------------- */
  function contactEmployer() {
    if (isExpired) {
      Alert.alert("Job expired", "This job is no longer active.");
      return;
    }

    Alert.alert(
      "Contact employer",
      "You’re about to contact the employer directly.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            try {
              if (job.contact_method === "call") {
                Linking.openURL(`tel:${job.contact_phone}`);
                return;
              }

              if (job.contact_method === "whatsapp") {
                const phone = job.contact_phone.replace("+", "");
                const msg = encodeURIComponent(
                  `Hello, I saw your job "${job.title}" on AwoJobs. Is it still available?`,
                );
                Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
                return;
              }

              if (job.contact_method === "walk_in") {
                Alert.alert(
                  "Walk-in job",
                  "Please visit the employer in person to apply.",
                );
              }
            } catch {
              Alert.alert(
                "Unable to open contact",
                "Please check your phone settings and try again.",
              );
            }
          },
        },
      ],
    );
  }

  const contactLabel =
    job.contact_method === "walk_in"
      ? "Walk in to apply"
      : job.contact_method === "call"
        ? "Call employer"
        : "Chat on WhatsApp";

  /* ---------------------------------------------
     UI
  ---------------------------------------------- */
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <View style={{ padding: 20 }}>
        {/* TITLE */}
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#0F172A",
            marginBottom: 8,
          }}
        >
          {job.title}
        </Text>

        {/* META */}
        <Text style={{ fontSize: 14, color: "#334155", marginBottom: 14 }}>
          Pay: <Text style={{ fontWeight: "700" }}>{job.pay_type}</Text>
          {isToday && (
            <Text style={{ color: "#B91C1C", fontWeight: "700" }}>
              {" "}
              • Today
            </Text>
          )}
          {isExpired && (
            <Text style={{ color: "#64748B", fontWeight: "700" }}>
              {" "}
              • Expired
            </Text>
          )}
        </Text>

        {/* SHARE */}
        <Pressable
          onPress={shareJob}
          style={{
            alignSelf: "flex-start",
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#CBD5E1",
            marginBottom: 24,
          }}
        >
          <Text style={{ fontWeight: "700", color: "#0F172A" }}>Share job</Text>
        </Pressable>

        {/* DETAILS */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: 8,
            }}
          >
            Job details
          </Text>

          {job.description ? (
            <Text
              style={{
                fontSize: 14,
                lineHeight: 22,
                color: "#334155",
              }}
            >
              {job.description}
            </Text>
          ) : (
            <Text style={{ fontSize: 14, color: "#64748B" }}>
              No additional details provided.
            </Text>
          )}
        </View>

        {/* EXPIRY */}
        <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
          Expires on {expiresAt.toLocaleDateString()}
        </Text>

        {/* TRUST NOTICE */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: 16,
            marginBottom: 28,
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Text style={{ fontSize: 13, lineHeight: 18, color: "#475569" }}>
            Always confirm job details directly. Avoid paying fees before
            starting work.
          </Text>
        </View>

        {/* PRIMARY ACTION */}
        <Pressable
          onPress={contactEmployer}
          disabled={isExpired}
          style={{
            backgroundColor: isExpired ? "#94A3B8" : "#0F172A",
            paddingVertical: 16,
            borderRadius: 16,
            marginBottom: 12,
            opacity: isExpired ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "800",
              fontSize: 16,
            }}
          >
            {isExpired ? "Job expired" : contactLabel}
          </Text>
        </Pressable>

        {/* SECONDARY INFO */}
        {job.contact_method !== "walk_in" && !isExpired && (
          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "#64748B",
            }}
          >
            Phone: {job.contact_phone}
          </Text>
        )}
      </View>
    </View>
  );
}
