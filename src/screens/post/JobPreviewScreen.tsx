import React from "react";
import { View, Text, Pressable } from "react-native";

type ContactMethod = "call" | "whatsapp" | "walk_in" | "in_app";
type PayType = "daily" | "weekly" | "monthly";

export default function JobPreviewScreen({ route, navigation }: any) {
  const { job, mode, jobId } = route.params as {
    job: {
      title: string;
      description?: string | null;
      pay_type: PayType;
      contact_method: ContactMethod;
      contact_phone?: string | null;
      expires_at: string;
      location_id: string;
      locationName?: string;
    };
    mode: "create" | "edit" | "renew";
    jobId?: string;
  };

  const isEdit = mode === "edit";
  const isRenew = mode === "renew";

  /* ======================================================
     ACTION LABEL
  ====================================================== */
  const actionLabel =
    job.contact_method === "walk_in"
      ? "Walk in"
      : job.contact_method === "call"
        ? "Call employer"
        : job.contact_method === "whatsapp"
          ? "Chat on WhatsApp"
          : "Apply in app";

  /* ======================================================
     CONTINUE
  ====================================================== */
  function handleContinue() {
    if (isEdit && jobId) {
      navigation.navigate("PostJobFlow", {
        screen: "PostJob",
        params: {
          job,
          jobId,
          mode: "edit_confirm",
        },
      });
      return;
    }

    // CREATE or RENEW → go to payment
    navigation.navigate("Payment", {
      jobDraft: job,
      mode,
      jobId,
    });
  }

  /* ======================================================
     UI
  ====================================================== */
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 6 }}>
          Preview job
        </Text>

        <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
          This is exactly how people in your area will see your job.
        </Text>

        {job.locationName && (
          <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 14 }}>
            Posting in {job.locationName}
          </Text>
        )}

        {/* PREVIEW CARD */}
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
          <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 6 }}>
            {job.title}
          </Text>

          {job.description ? (
            <Text style={{ fontSize: 13, marginBottom: 8 }}>
              {job.description}
            </Text>
          ) : null}

          <Text style={{ fontSize: 14, marginBottom: 4 }}>
            Pay: <Text style={{ fontWeight: "700" }}>{job.pay_type}</Text>
          </Text>

          <Text style={{ fontSize: 13, marginBottom: 6 }}>
            Contact: {actionLabel}
            {job.contact_method !== "walk_in" &&
              job.contact_method !== "in_app" &&
              job.contact_phone &&
              ` • ${job.contact_phone}`}
          </Text>

          <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
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
                job.contact_method === "whatsapp" ||
                job.contact_method === "in_app"
                  ? "#0F172A"
                  : "transparent",
              borderWidth:
                job.contact_method === "whatsapp" ||
                job.contact_method === "in_app"
                  ? 0
                  : 1.5,
              borderColor: "#0F172A",
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                color:
                  job.contact_method === "whatsapp" ||
                  job.contact_method === "in_app"
                    ? "#FFFFFF"
                    : "#0F172A",
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
          <Text style={{ fontSize: 13, color: "#475569", lineHeight: 18 }}>
            This job will appear in your selected location.{" "}
            {!isEdit && "Payment is required before it goes live."}
          </Text>
        </View>

        {/* CONTINUE */}
        <Pressable
          onPress={handleContinue}
          style={{
            backgroundColor: "#0F172A",
            paddingVertical: 16,
            borderRadius: 16,
            marginBottom: 12,
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
            {isEdit ? "Save changes" : "Continue"}
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ textAlign: "center", fontSize: 13, color: "#64748B" }}>
            Go back and edit
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
