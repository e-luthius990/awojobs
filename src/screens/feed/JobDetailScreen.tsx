import React, { useState } from "react";
import { View, Text, Pressable, Alert, Share } from "react-native";
import * as Linking from "expo-linking";
import { useNavigation, RouteProp } from "@react-navigation/native";
import { supabase } from "../../core/supabase";
import { Job } from "../../jobs/jobs.types";
import { useSession } from "../../state/useSession";
import { setPendingIntent } from "../../intent/intent.store";
import { getDeviceHash } from "../../security/device";
import { ENV } from "../../core/config";

/* ---------------------------------------------
   TYPES
---------------------------------------------- */
type JobDetailRoute = {
  JobDetail: { job: Job };
};

/* ---------------------------------------------
   HELPERS
---------------------------------------------- */

function sanitize(text?: string | null, max = 400) {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ").slice(0, max);
}

function normalizeUgPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("256")) return "+" + digits;
  if (digits.startsWith("0")) return "+256" + digits.slice(1);

  return "+256" + digits;
}

function buildShareText(job: Job) {
  const expires = new Date(job.expires_at).toLocaleDateString("en-UG");

  const contactLine =
    job.contact_method === "walk_in"
      ? "Apply: Walk-in"
      : job.contact_method === "in_app"
        ? "Apply: In app"
        : `Contact: ${job.contact_method.toUpperCase()} • ${job.contact_phone}`;

  const description = sanitize(job.description, 300);
  const details = description ? `\n\nDetails:\n${description}` : "";

  const url = `${ENV.WEB_BASE_URL}/job/${job.id}`;

  return (
    `Job Opportunity — AwoJobs\n\n` +
    `${sanitize(job.title, 120)}\n` +
    `Pay: ${job.pay_type}\n` +
    `${contactLine}\n` +
    `Expires: ${expires}` +
    `${details}\n\n` +
    `View: ${url}`
  );
}

/* ---------------------------------------------
   SCREEN
---------------------------------------------- */

export default function JobDetailScreen({
  route,
}: {
  route: RouteProp<JobDetailRoute, "JobDetail">;
}) {
  const { job } = route.params;
  const navigation = useNavigation<any>();
  const { session } = useSession();
  const [applying, setApplying] = useState(false);

  const now = Date.now();
  const expiresAt = new Date(job.expires_at).getTime();

  const isExpired = expiresAt <= now;
  const isToday =
    new Date(expiresAt).toDateString() === new Date(now).toDateString();

  /* ---------------------------------------------
     SHARE
  ---------------------------------------------- */
  async function shareJob() {
    try {
      await Share.share({
        message: buildShareText(job),
        title: "AwoJobs",
      });
    } catch {
      Alert.alert("Unable to share");
    }
  }

  /* ---------------------------------------------
     APPLY (IN-APP)
  ---------------------------------------------- */
  async function applyInApp() {
    if (isExpired) {
      Alert.alert("Job expired");
      return;
    }

    if (!session) {
      setPendingIntent({
        type: "APPLY_JOB",
        jobId: job.id,
      });

      navigation.navigate("AuthModal");
      return;
    }

    if (applying) return;
    setApplying(true);

    try {
      const deviceHash = await getDeviceHash();

      const { error } = await supabase.functions.invoke("apply_job", {
        body: {
          job_id: job.id,
          device_hash: deviceHash,
        },
      });

      if (error) throw error;

      Alert.alert(
        "Application sent",
        "The employer will contact you if shortlisted.",
      );
    } catch (e: any) {
      Alert.alert("Unable to apply", e?.message ?? "Please try again later.");
    } finally {
      setApplying(false);
    }
  }

  /* ---------------------------------------------
     CONTACT
  ---------------------------------------------- */
  function contactEmployer() {
    if (isExpired) {
      Alert.alert("Job expired");
      return;
    }

    try {
      if (job.contact_method === "call") {
        Linking.openURL(`tel:${normalizeUgPhone(job.contact_phone)}`);
        return;
      }

      if (job.contact_method === "whatsapp") {
        const phone = normalizeUgPhone(job.contact_phone);
        const msg = encodeURIComponent(
          `Hello, I saw your job "${job.title}" on AwoJobs. Is it still available?`,
        );
        Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
        return;
      }

      if (job.contact_method === "walk_in") {
        Alert.alert("Walk-in job", "Visit the employer in person.");
      }
    } catch {
      Alert.alert("Unable to open contact");
    }
  }

  const primaryAction =
    job.contact_method === "in_app" ? applyInApp : contactEmployer;

  /* ---------------------------------------------
     UI
  ---------------------------------------------- */
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <View style={{ padding: 20 }}>
        {job.is_sponsored && (
          <View
            style={{
              backgroundColor: "#FEF3C7",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              alignSelf: "flex-start",
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700" }}>Sponsored</Text>
          </View>
        )}

        <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 8 }}>
          {sanitize(job.title, 150)}
        </Text>

        <Text style={{ marginBottom: 14 }}>
          Pay: <Text style={{ fontWeight: "700" }}>{job.pay_type}</Text>
          {isToday && <Text style={{ color: "#B91C1C" }}> • Today</Text>}
          {isExpired && <Text style={{ opacity: 0.6 }}> • Expired</Text>}
        </Text>

        <Pressable onPress={shareJob}>
          <Text style={{ marginBottom: 20 }}>Share job</Text>
        </Pressable>

        {job.description && (
          <Text style={{ marginBottom: 20 }}>
            {sanitize(job.description, 1000)}
          </Text>
        )}

        <Pressable
          onPress={primaryAction}
          disabled={isExpired || applying}
          style={{
            backgroundColor: "#0F172A",
            paddingVertical: 16,
            borderRadius: 16,
            opacity: isExpired ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "800",
            }}
          >
            {isExpired
              ? "Job expired"
              : job.contact_method === "in_app"
                ? applying
                  ? "Applying..."
                  : "Apply in app"
                : "Contact employer"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
