import React, { useRef, useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";

export default function JobPreviewScreen({ route, navigation }: any) {
  const { job, onConfirm, isEdit } = route.params as {
    job: {
      title: string;
      pay_type: "daily" | "weekly" | "monthly";
      contact_method: "call" | "whatsapp" | "walk_in";
      contact_phone: string;
      expires_at: string;
      locationName?: string;
    };
    onConfirm(): Promise<void>;
    isEdit: boolean;
  };

  const [posting, setPosting] = useState(false);
  const lockedRef = useRef(false);

  /* ======================================================
     CONFIRM (DELEGATES TO POST JOB SCREEN)
  ====================================================== */
  async function confirm() {
    if (lockedRef.current) return;

    lockedRef.current = true;
    setPosting(true);

    try {
      await onConfirm();
    } catch (e: any) {
      lockedRef.current = false;
      Alert.alert("Failed", e?.message ?? "Try again.");
    } finally {
      setPosting(false);
    }
  }

  const actionLabel =
    job.contact_method === "walk_in"
      ? "Walk in"
      : job.contact_method === "call"
        ? "Call employer"
        : "Chat on WhatsApp";

  /* ======================================================
     UI
  ====================================================== */
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <View style={{ padding: 20 }}>
        {/* HEADER */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: "#0F172A",
            marginBottom: 6,
          }}
        >
          Preview job
        </Text>

        <Text
          style={{
            fontSize: 13,
            color: "#64748B",
            marginBottom: 16,
          }}
        >
          This is exactly how people near you will see your job.
        </Text>

        {job.locationName && (
          <Text
            style={{
              fontSize: 13,
              color: "#64748B",
              marginBottom: 14,
            }}
          >
            Posting in {job.locationName}
          </Text>
        )}

        {/* PREVIEW CARD (MATCHES FEED CARD LANGUAGE) */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: "#0F172A",
              marginBottom: 6,
            }}
          >
            {job.title}
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: "#334155",
              marginBottom: 4,
            }}
          >
            Pay: <Text style={{ fontWeight: "700" }}>{job.pay_type}</Text>
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: "#475569",
              marginBottom: 6,
            }}
          >
            Contact: {actionLabel}
            {job.contact_method !== "walk_in" && ` • ${job.contact_phone}`}
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: "#64748B",
              marginBottom: 14,
            }}
          >
            Expires on {new Date(job.expires_at).toLocaleDateString()}
          </Text>

          {/* CTA MOCK */}
          <View
            style={{
              alignSelf: "flex-start",
              paddingVertical: 8,
              paddingHorizontal: 18,
              borderRadius: 999,
              backgroundColor:
                job.contact_method === "whatsapp" ? "#0F172A" : "transparent",
              borderWidth: job.contact_method === "whatsapp" ? 0 : 1.5,
              borderColor: "#0F172A",
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                color:
                  job.contact_method === "whatsapp" ? "#FFFFFF" : "#0F172A",
              }}
            >
              {actionLabel}
            </Text>
          </View>
        </View>

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
          <Text
            style={{
              fontSize: 13,
              lineHeight: 18,
              color: "#475569",
            }}
          >
            This job will only be shown to people in your area. Applicants
            contact you directly. You can delete this job anytime.
          </Text>
        </View>

        {/* CONFIRM */}
        <Pressable
          onPress={confirm}
          disabled={posting}
          style={{
            backgroundColor: "#0F172A",
            paddingVertical: 16,
            borderRadius: 16,
            marginBottom: 12,
            opacity: posting ? 0.7 : 1,
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
            {posting
              ? isEdit
                ? "Saving…"
                : "Posting…"
              : isEdit
                ? "Confirm changes"
                : "Confirm & post"}
          </Text>
        </Pressable>

        {/* BACK */}
        <Pressable onPress={() => navigation.goBack()} disabled={posting}>
          <Text
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#64748B",
            }}
          >
            Go back and edit
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
