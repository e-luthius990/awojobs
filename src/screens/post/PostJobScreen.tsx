import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";

import { resolveLocation } from "../../location/location.service";
import { updateJob } from "../../jobs/jobs.update";
import { Job } from "../../jobs/jobs.types";
import { PostingSuccessPrompt } from "../../ui/components/PostingSuccessPrompt";

type ContactMethod = "call" | "whatsapp" | "walk_in" | "in_app";
type PayType = "daily" | "weekly" | "monthly";

type Props = {
  navigation: any;
  route: any;
};

export default function PostJobScreen({ navigation, route }: Props) {
  const { job: editingJob, jobId, mode = "create" } = route?.params ?? {};

  const isEdit = mode === "edit";
  const isRenew = mode === "renew";

  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  const [title, setTitle] = useState(editingJob?.title ?? "");
  const [description, setDescription] = useState(editingJob?.description ?? "");

  const [payType, setPayType] = useState<PayType>(
    editingJob?.pay_type ?? "daily",
  );

  const [contactMethod, setContactMethod] = useState<ContactMethod>(
    editingJob?.contact_method ?? "call",
  );

  const [phone, setPhone] = useState(editingJob?.contact_phone ?? "");

  const [expiryDays] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [postedJob, setPostedJob] = useState<Job | null>(null);

  /* ================= LOCATION ================= */
  useEffect(() => {
    (async () => {
      if (editingJob) {
        setLocationId(editingJob.location_id);
        setLocationName(editingJob.location_name ?? null);
        return;
      }

      const loc = await resolveLocation();
      if (!loc?.location_id) return;

      setLocationId(loc.location_id);
      setLocationName([loc.town, loc.sub_county].filter(Boolean).join(", "));
    })();
  }, [editingJob]);

  function computeExpiry(): Date {
    if (isEdit && editingJob?.expires_at) {
      return new Date(editingJob.expires_at);
    }

    const expires = new Date();
    expires.setDate(expires.getDate() + expiryDays);
    return expires;
  }

  function normalizePhone(input: string) {
    const cleaned = input.replace(/\s+/g, "");
    if (cleaned.startsWith("+256")) return cleaned;
    if (cleaned.startsWith("0")) return "+256" + cleaned.slice(1);
    return cleaned;
  }

  /* ================= PREVIEW ================= */
  function goPreview() {
    if (!locationId) {
      Alert.alert("Location required", "Please set your location first.");
      return;
    }

    if (title.trim().length < 4) {
      Alert.alert("Job title too short");
      return;
    }

    if (contactMethod !== "walk_in" && normalizePhone(phone).length < 12) {
      Alert.alert("Invalid phone number");
      return;
    }

    const draft = {
      title: title.trim(),
      description: description.trim() || null,
      pay_type: payType,
      contact_method: contactMethod,
      contact_phone: contactMethod === "walk_in" ? null : normalizePhone(phone),
      expires_at: computeExpiry().toISOString(),
      location_id: locationId,
    };

    if (isEdit && jobId) {
      navigation.navigate("Preview", {
        job: draft,
        isEdit: true,
        onConfirm: submitEdit,
      });
      return;
    }

    // CREATE or RENEW → Payment required
    navigation.navigate("Payment", {
      jobDraft: draft,
      mode,
      jobId,
    });
  }

  /* ================= EDIT SUBMIT ================= */
  async function submitEdit() {
    if (!jobId) return;

    setLoading(true);

    try {
      const saved = await updateJob(jobId, {
        title: title.trim(),
        description: description.trim() || null,
        pay_type: payType,
        contact_method: contactMethod,
        contact_phone:
          contactMethod === "walk_in" ? null : normalizePhone(phone),
        expires_at: computeExpiry(),
      });

      setPostedJob(saved);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (postedJob) {
    return (
      <PostingSuccessPrompt
        job={postedJob}
        onDone={() => navigation.popToTop()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ padding: 20 }}>
        <Text style={styles.header}>
          {isEdit ? "Edit job" : isRenew ? "Renew job" : "Post a job"}
        </Text>

        {locationName && !isEdit && (
          <Text style={styles.subtle}>Posting in {locationName}</Text>
        )}

        {/* Title */}
        <Text style={styles.label}>Job title</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} />

        {/* Description */}
        <Text style={styles.label}>Job description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, { height: 100 }]}
        />

        {/* Pay Type */}
        <Text style={styles.label}>Pay type</Text>
        <Row>
          {(["daily", "weekly", "monthly"] as const).map((p) => (
            <Chip key={p} active={payType === p} onPress={() => setPayType(p)}>
              {p}
            </Chip>
          ))}
        </Row>

        {/* Contact Method */}
        <Text style={styles.label}>How should people contact you?</Text>
        <Row>
          {(["call", "whatsapp", "in_app", "walk_in"] as const).map((m) => (
            <Chip
              key={m}
              active={contactMethod === m}
              onPress={() => setContactMethod(m)}
            >
              {m.replace("_", " ")}
            </Chip>
          ))}
        </Row>

        {/* Phone */}
        {contactMethod !== "walk_in" && (
          <>
            <Text style={styles.label}>Contact phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </>
        )}

        <Pressable
          onPress={goPreview}
          disabled={loading}
          style={[styles.primaryButton, { opacity: loading ? 0.7 : 1 }]}
        >
          <Text style={styles.primaryText}>
            {isEdit ? "Preview changes" : "Preview job"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  subtle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#0F172A",
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 20,
  },
  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 15,
  },
});

function Row({ children }: any) {
  return (
    <View
      style={{
        flexDirection: "row",
        marginBottom: 16,
      }}
    >
      {children}
    </View>
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
