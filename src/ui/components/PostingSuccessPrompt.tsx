import React from "react";
import { View, Text, Pressable, Share, Alert } from "react-native";
import { Job } from "../../jobs/jobs.types";
import { normalizeUgPhone } from "@utils/normalizeUgPhone";

const APP_URL = "https://awojobs.app";

export function PostingSuccessPrompt({
  job,
  onDone,
}: {
  job: Job;
  onDone(): void;
}) {
  async function shareJob() {
    try {
      await Share.share({
        message: buildShareText(job),
      });
    } catch {
      Alert.alert("Could not share", "Please try again.");
    }
  }

  const expired = new Date(job.expires_at).getTime() < Date.now();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#F8F9FB",
      }}
    >
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          padding: 24,
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <Text style={title}>Job posted successfully 🎉</Text>

        <Text style={message}>
          Share this job to reach more candidates in your area.
        </Text>

        {!expired && (
          <Pressable onPress={shareJob} style={primaryBtn}>
            <Text style={primaryText}>Share job</Text>
          </Pressable>
        )}

        <Pressable onPress={onDone}>
          <Text style={secondary}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------------------------------------------
   SHARE TEXT (UGANDA-LOCKED)
---------------------------------------------- */
function buildShareText(job: Job) {
  const expiresAt = new Date(job.expires_at).toLocaleDateString();

  let contact = "Apply via AwoJobs app";

  if (job.contact_method === "walk_in") {
    contact = "Apply: Walk in";
  }

  if (job.contact_phone) {
    const normalized = normalizeUgPhone(job.contact_phone);

    const validUg = /^\+2567\d{8}$/.test(normalized);

    if (validUg) {
      contact = `Contact: ${normalized}`;
    }
  }

  return (
    `JOB AVAILABLE 🔔\n\n` +
    `${job.title}\n` +
    `Pay: ${job.pay_type}\n` +
    `${contact}\n` +
    `Expires: ${expiresAt}\n\n` +
    `View job:\n${APP_URL}/job/${job.id}`
  );
}
