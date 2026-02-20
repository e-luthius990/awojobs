import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabaseAnon } from "@core/supabaseAnon";

const LOCAL_KEY = "saved_job_ids";

export function useSavedJob(jobId: string) {
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  /* ---------------- GET SESSION ---------------- */
  useEffect(() => {
    supabaseAnon.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    if (!jobId) return;

    if (userId) {
      // Authenticated → check server
      supabaseAnon
        .from("saved_jobs")
        .select("job_id")
        .eq("job_id", jobId)
        .maybeSingle()
        .then(({ data }) => {
          setSaved(Boolean(data));
        });
    } else {
      // Guest → check local
      AsyncStorage.getItem(LOCAL_KEY).then((raw) => {
        const ids: string[] = raw ? JSON.parse(raw) : [];
        setSaved(ids.includes(jobId));
      });
    }
  }, [jobId, userId]);

  /* ---------------- TOGGLE ---------------- */
  const toggleSave = useCallback(async () => {
    if (!jobId) return;

    if (userId) {
      if (saved) {
        await supabaseAnon
          .from("saved_jobs")
          .delete()
          .eq("job_id", jobId);
        setSaved(false);
      } else {
        await supabaseAnon
          .from("saved_jobs")
          .insert({ job_id: jobId });
        setSaved(true);
      }
    } else {
      const raw = await AsyncStorage.getItem(LOCAL_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];

      const updated = saved
        ? ids.filter((id) => id !== jobId)
        : [...ids, jobId];

      await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
      setSaved(!saved);
    }
  }, [jobId, saved, userId]);

  return { saved, toggleSave };
}
