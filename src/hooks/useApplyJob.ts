import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import { supabase } from "@core/supabase";
import type { JobWithCoords } from "@jobs/jobs.types";
import { useAppliedJobs } from "./useAppliedJobs";

export function useApplyJob(job: JobWithCoords) {
  const [applyOpen, setApplyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submitLockedRef = useRef(false);
  const { applied, markApplied } = useAppliedJobs(job.id);

  const submitApplication = useCallback(async () => {
    if (submitLockedRef.current || submitting) return;

    submitLockedRef.current = true;
    setSubmitting(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert(
          "Login required",
          "You must be logged in to apply for jobs.",
        );
        return;
      }

      const { error } = await supabase.from("applications").insert({
        job_id: job.id,
        source: "in_app",
      });

      if (error) {
        if (error.code === "23505") {
          Alert.alert(
            "Already applied",
            "You have already applied for this job.",
          );
          await markApplied(job.id);
          setApplyOpen(false);
          return;
        }

        if (error.message?.includes("Job not found")) {
          Alert.alert(
            "Job unavailable",
            "This job could not be found.",
          );
          return;
        }

        if (error.message?.includes("Job not active")) {
          Alert.alert(
            "Job unavailable",
            "This job is no longer accepting applications.",
          );
          return;
        }

        if (error.message?.includes("Job expired")) {
          Alert.alert(
            "Job expired",
            "This job is no longer accepting applications.",
          );
          return;
        }

        if (error.message?.includes("Only job seekers")) {
          Alert.alert(
            "Not allowed",
            "Only job seekers can apply for jobs.",
          );
          return;
        }

        if (error.message?.includes("Cannot apply to your own job")) {
          Alert.alert(
            "Not allowed",
            "You cannot apply to your own job.",
          );
          return;
        }

        throw error;
      }

      await markApplied(job.id);
      setApplyOpen(false);

      Alert.alert(
        "Application sent",
        "The employer will contact you if shortlisted.",
      );
    } catch (err) {
      console.error("Apply error", err);
      Alert.alert(
        "Application failed",
        "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
      submitLockedRef.current = false;
    }
  }, [job.id, markApplied, submitting]);

  return {
    applyOpen,
    setApplyOpen,
    applied,
    submitting,
    submitApplication,
  };
}