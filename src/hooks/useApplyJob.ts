import { useState } from "react";
import { Alert } from "react-native";
import { supabase } from "@core/supabase";
import type { JobWithCoords } from "@jobs/jobs.types";
import { useAppliedJobs } from "./useAppliedJobs";

export function useApplyJob(job: JobWithCoords) {
  const [submitting, setSubmitting] = useState(false);
  const { applied, markApplied } = useAppliedJobs(job.id);

  async function submitApplication() {
    try {
      setSubmitting(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert(
          "Login required",
          "You must be logged in to apply for jobs."
        );
        return;
      }

      const { error } = await supabase
        .from("applications")
        .insert({
          job_id: job.id,
          user_id: user.id, // will be enforced by trigger anyway
          source: "in_app",
        });

      if (error) {
        // Duplicate protection (unique index)
        if (error.code === "23505") {
          Alert.alert(
            "Already applied",
            "You have already applied for this job."
          );
          await markApplied(job.id);
          return;
        }

        if (error.message?.includes("Job not active")) {
          Alert.alert(
            "Job unavailable",
            "This job is no longer accepting applications."
          );
          return;
        }

        if (error.message?.includes("Only job seekers")) {
          Alert.alert(
            "Not allowed",
            "Only job seekers can apply for jobs."
          );
          return;
        }

        throw error;
      }

      await markApplied(job.id);

      Alert.alert(
        "Application sent",
        "The employer will contact you if shortlisted."
      );
    } catch (err) {
      console.error("Apply error", err);
      Alert.alert(
        "Application failed",
        "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return {
    applied,
    submitting,
    submitApplication,
  };
}