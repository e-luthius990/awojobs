import React from "react";
import { View, Text, Pressable, Share } from "react-native";
import { Job } from "../../jobs/jobs.types";

/* ======================================================
   POST SUCCESS → SHARE PROMPT
====================================================== */
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
    } finally {
      onDone();
    }
  }

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
        {/* TITLE */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: "#0F172A",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Job posted successfully 🎉
        </Text>

        {/* MESSAGE */}
        <Text
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: "#475569",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Want to get responses faster? Share this job with people around you.
        </Text>

        {/* PRIMARY ACTION */}
        <Pressable
          onPress={shareJob}
          style={{
            backgroundColor: "#0F172A",
            paddingVertical: 14,
            borderRadius: 999,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "800",
              fontSize: 15,
            }}
          >
            Share job
          </Text>
        </Pressable>

        {/* SECONDARY */}
        <Pressable onPress={onDone}>
          <Text
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#64748B",
            }}
          >
            I’ll do this later
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------------------------------------------
   SHARE TEXT (UGANDA-FRIENDLY)
---------------------------------------------- */
function buildShareText(job: Job) {
  const expiresAt = new Date(job.expires_at).toLocaleDateString();

  const contactLine =
    job.contact_method === "walk_in"
      ? "Apply: Walk-in"
      : `Contact: ${job.contact_phone}`;

  return (
    `Job opportunity\n\n` +
    `${job.title}\n` +
    `Pay: ${job.pay_type}\n` +
    `${contactLine}\n` +
    `Expires: ${expiresAt}\n\n` +
    `Posted on AwoJobs`
  );
}
