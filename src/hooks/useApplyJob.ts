import { useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { JobWithCoords } from "@jobs/jobs.types";
import { supabaseAnon } from "@core/supabaseAnon";
import { useAppliedJobs } from "./useAppliedJobs";
import { getDeviceHash } from "../security/device";
import { normalizeUgPhone } from "@utils/normalizeUgPhone";

export function useApplyJob(job: JobWithCoords) {
  const [applyOpen, setApplyOpen] = useState(false);
  const [name, setName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { applied, markApplied } = useAppliedJobs(job.id);

  useEffect(() => {
    AsyncStorage.getItem("applicant_profile").then((data) => {
      if (!data) return;
      try {
        const parsed = JSON.parse(data);
        setName(parsed.name ?? "");
        setPhoneInput(parsed.phone ?? "");
      } catch {}
    });
  }, []);

  async function submitApplication() {
    const trimmedName = name.trim();

    if (!trimmedName || !phoneInput.trim()) {
      Alert.alert("Missing details", "Please enter your name and phone number.");
      return;
    }

    const normalizedPhone = normalizeUgPhone(phoneInput);

    if (!normalizedPhone) {
      Alert.alert(
        "Invalid number",
        "Please enter a valid Uganda mobile number (07XXXXXXXX)."
      );
      return;
    }

    setSubmitting(true);

    try {
      const deviceHash = await getDeviceHash();

      const { error } = await supabaseAnon.rpc(
        "submit_application_secure",
        {
          p_job_id: job.id,
          p_name: trimmedName,
          p_phone: normalizedPhone,
          p_device_hash: deviceHash,
        }
      );

      if (error) {
        if (error.message === "rate_limit_exceeded") {
          Alert.alert(
            "Slow down",
            "You have submitted too many applications. Please wait."
          );
          return;
        }

        if (error.message === "job_not_available") {
          Alert.alert(
            "Job unavailable",
            "This job is no longer accepting applications."
          );
          setApplyOpen(false);
          return;
        }

        if (error.code === "23505") {
          Alert.alert(
            "Already applied",
            "You already applied for this job."
          );
          await markApplied(job.id);
          setApplyOpen(false);
          return;
        }

        throw error;
      }

      await markApplied(job.id);

      await AsyncStorage.setItem(
        "applicant_profile",
        JSON.stringify({
          name: trimmedName,
          phone: normalizedPhone,
        })
      );

      setApplyOpen(false);

      Alert.alert(
        "Application sent",
        "The employer will contact you directly."
      );
    } catch {
      Alert.alert(
        "Failed to apply",
        "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return {
    applyOpen,
    setApplyOpen,
    applied,
    submitting,
    name,
    setName,
    phoneInput,
    setPhoneInput,
    submitApplication,
  };
}
