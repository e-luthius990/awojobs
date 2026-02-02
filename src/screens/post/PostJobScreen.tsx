import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";

import { resolveLocation } from "../../location/location.service";
import { postJob } from "../../jobs/jobs.post";
import { updateJob } from "../../jobs/jobs.update";
import { Job } from "../../jobs/jobs.types";
import { PostingSuccessPrompt } from "../../ui/components/PostingSuccessPrompt";

export default function PostJobScreen({ navigation, route }: any) {
  const editingJob: Job | undefined = route?.params?.job;
  const isEdit = Boolean(editingJob);

  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  const [title, setTitle] = useState(editingJob?.title ?? "");
  const [payType, setPayType] = useState<"daily" | "weekly" | "monthly">(
    editingJob?.pay_type ?? "daily",
  );

  const [contactMethod, setContactMethod] = useState<
    "call" | "whatsapp" | "walk_in"
  >(editingJob?.contact_method ?? "call");

  const [phone, setPhone] = useState(editingJob?.contact_phone ?? "");

  const [expiryDays, setExpiryDays] = useState(() => {
    if (!editingJob) return 7;
    const diff =
      (new Date(editingJob.expires_at).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);
    return Math.max(1, Math.ceil(diff));
  });

  const [loading, setLoading] = useState(false);

  // 🔹 NEW: posted job state (triggers success prompt)
  const [postedJob, setPostedJob] = useState<Job | null>(null);

  /* =====================================================
     LOCATION
  ====================================================== */
  useEffect(() => {
    (async () => {
      if (editingJob) {
        setLocationId(editingJob.location_id);
        return;
      }

      const loc = await resolveLocation();
      if (!loc?.location_id) return;

      setLocationId(loc.location_id);
      setLocationName([loc.town, loc.sub_county].filter(Boolean).join(", "));
    })();
  }, []);

  /* =====================================================
     PREVIEW
  ====================================================== */
  function goPreview() {
    if (!locationId) {
      Alert.alert("Location unavailable");
      return;
    }

    if (title.trim().length < 4) {
      Alert.alert("Job title too short");
      return;
    }

    if (contactMethod !== "walk_in" && phone.trim().length < 9) {
      Alert.alert("Invalid phone number");
      return;
    }

    const expires = new Date();
    expires.setDate(expires.getDate() + expiryDays);

    navigation.navigate("Preview", {
      job: {
        ...(editingJob ?? {}),
        title: title.trim(),
        pay_type: payType,
        contact_method: contactMethod,
        contact_phone: phone.trim(),
        expires_at: expires.toISOString(),
        location_id: locationId,
        locationName,
      },
      onConfirm: submit,
      isEdit,
    });
  }

  /* =====================================================
     SUBMIT
  ====================================================== */
  async function submit() {
    if (!locationId) return;

    setLoading(true);
    try {
      const expires = new Date();
      expires.setDate(expires.getDate() + expiryDays);

      if (isEdit && editingJob) {
        await updateJob(editingJob.id, {
          title,
          pay_type: payType,
          contact_method: contactMethod,
          contact_phone: phone,
          expires_at: expires,
        });
      } else {
        await postJob({
          title,
          pay_type: payType,
          contact_method: contactMethod,
          contact_phone: phone,
          expires_at: expires,
          location_id: locationId,
        });
      }

      // 🔹 Instead of alert + pop, show success share prompt
      setPostedJob({
        ...(editingJob ?? {}),
        title,
        pay_type: payType,
        contact_method: contactMethod,
        contact_phone: phone,
        expires_at: expires.toISOString(),
      } as Job);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Try again.");
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     SUCCESS → SHARE PROMPT
  ====================================================== */
  if (postedJob) {
    return (
      <PostingSuccessPrompt
        job={postedJob}
        onDone={() => navigation.popToTop()}
      />
    );
  }

  /* =====================================================
     UI
  ====================================================== */
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <View style={{ padding: 20 }}>
        {/* HEADER */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: "#0F172A",
            marginBottom: 6,
          }}
        >
          {isEdit ? "Edit job" : "Post a job"}
        </Text>

        {locationName && !isEdit && (
          <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
            Posting in {locationName}
          </Text>
        )}

        {/* TITLE */}
        <Text style={label}>Job title</Text>
        <TextInput
          placeholder="e.g. House cleaner needed"
          value={title}
          onChangeText={setTitle}
          style={input}
        />

        {/* PAY TYPE */}
        <Text style={label}>Pay type</Text>
        <Row>
          {(["daily", "weekly", "monthly"] as const).map((p) => (
            <Chip key={p} active={payType === p} onPress={() => setPayType(p)}>
              {p}
            </Chip>
          ))}
        </Row>

        {/* CONTACT METHOD */}
        <Text style={label}>How should people contact you?</Text>
        <Row>
          {(["call", "whatsapp", "walk_in"] as const).map((m) => (
            <Chip
              key={m}
              active={contactMethod === m}
              onPress={() => setContactMethod(m)}
            >
              {m.replace("_", " ")}
            </Chip>
          ))}
        </Row>

        {/* PHONE */}
        {contactMethod !== "walk_in" && (
          <>
            <Text style={label}>Contact phone</Text>
            <TextInput
              placeholder="e.g. 0700 123 456"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={input}
            />
          </>
        )}

        {/* PRIMARY ACTION */}
        <Pressable
          onPress={goPreview}
          disabled={loading}
          style={{
            backgroundColor: "#0F172A",
            paddingVertical: 14,
            borderRadius: 16,
            marginTop: 20,
            opacity: loading ? 0.7 : 1,
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
            {isEdit ? "Preview changes" : "Preview job"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* -------------------------------------------------------
   STYLES
-------------------------------------------------------- */
const input = {
  borderWidth: 1,
  borderColor: "#E5E7EB",
  padding: 14,
  borderRadius: 14,
  backgroundColor: "#FFFFFF",
  marginBottom: 16,
};

const label = {
  fontSize: 13,
  fontWeight: "700",
  color: "#334155",
  marginBottom: 6,
};

function Row({ children }: any) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 16 }}>{children}</View>
  );
}

function Chip({ children, active, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#0F172A" : "#CBD5E1",
        backgroundColor: active ? "#0F172A" : "transparent",
        marginRight: 10,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: active ? "#FFFFFF" : "#0F172A",
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
