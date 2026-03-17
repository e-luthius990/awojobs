import { useEffect, useState, useCallback } from "react";
import { supabase } from "@core/supabase";

type UserRole =
  | "job_seeker"
  | "employer"
  | "moderator"
  | "super_admin"
  | null;

export function useSavedJob(jobId: string) {
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const uid = session?.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setRole(null);
        setSaved(false);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      setRole((profile?.role as UserRole) ?? null);
      setLoading(false);
    };

    void loadAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const uid = session?.user?.id ?? null;
        setUserId(uid);

        if (!uid) {
          setRole(null);
          setSaved(false);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .maybeSingle();

        setRole((profile?.role as UserRole) ?? null);
        setLoading(false);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadSaved = async () => {
      if (!jobId || !userId || role !== "job_seeker") {
        setSaved(false);
        return;
      }

      const { data, error } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("job_id", jobId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        setSaved(false);
        return;
      }

      setSaved(Boolean(data));
    };

    void loadSaved();
  }, [jobId, userId, role]);

  const toggleSave = useCallback(async () => {
    if (!jobId) {
      throw new Error("missing_job_id");
    }

    if (!userId) {
      throw new Error("signin_required");
    }

    if (role !== "job_seeker") {
      throw new Error("only_jobseekers_can_save");
    }

    if (saved) {
      const { error } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("job_id", jobId)
        .eq("user_id", userId);

      if (error) throw error;

      setSaved(false);
      return;
    }

    const { error } = await supabase
      .from("saved_jobs")
      .upsert(
        { job_id: jobId, user_id: userId },
        { onConflict: "user_id,job_id" }
      );

    if (error) throw error;

    setSaved(true);
  }, [jobId, saved, userId, role]);

  return {
    saved,
    toggleSave,
    loading,
    canSave: !!userId && role === "job_seeker",
    isGuest: !userId,
    role,
  };
}