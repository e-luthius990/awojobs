import { useEffect, useState, useCallback } from "react";
import { supabase } from "@core/supabase";

type UserRole =
  | "job_seeker"
  | "employer"
  | "moderator"
  | "super_admin"
  | null;

type SavedJobError =
  | "missing_job_id"
  | "signin_required"
  | "only_jobseekers_can_save"
  | "unknown_error"
  | null;

export function useSavedJob(jobId: string) {
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SavedJobError>(null);

  const loadProfile = useCallback(async (uid: string | null) => {
    if (!uid) {
      setUserId(null);
      setRole(null);
      setSaved(false);
      return;
    }

    setUserId(uid);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .maybeSingle();

    if (profileError) {
      setRole(null);
      setSaved(false);
      return;
    }

    setRole((profile?.role as UserRole) ?? null);
  }, []);

  const refreshSaved = useCallback(async () => {
    if (!jobId || !userId || role !== "job_seeker") {
      setSaved(false);
      return;
    }

    const { data, error: savedError } = await supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .maybeSingle();

    if (savedError) {
      setSaved(false);
      return;
    }

    setSaved(Boolean(data));
  }, [jobId, role, userId]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      const uid = session?.user?.id ?? null;
      await loadProfile(uid);

      if (!active) return;
      setLoading(false);
    };

    void bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!active) return;

        setLoading(true);
        setError(null);

        const uid = session?.user?.id ?? null;
        await loadProfile(uid);

        if (!active) return;
        setLoading(false);
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!jobId || !userId || role !== "job_seeker") {
        if (active) {
          setSaved(false);
        }
        return;
      }

      const { data, error: savedError } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("job_id", jobId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;

      if (savedError) {
        setSaved(false);
        return;
      }

      setSaved(Boolean(data));
    };

    void run();

    return () => {
      active = false;
    };
  }, [jobId, role, userId]);

  const toggleSave = useCallback(async () => {
    setError(null);

    if (!jobId) {
      setError("missing_job_id");
      throw new Error("missing_job_id");
    }

    if (!userId) {
      setError("signin_required");
      throw new Error("signin_required");
    }

    if (role !== "job_seeker") {
      setError("only_jobseekers_can_save");
      throw new Error("only_jobseekers_can_save");
    }

    if (busy) return;

    setBusy(true);

    try {
      if (saved) {
        const { error: deleteError } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("job_id", jobId)
          .eq("user_id", userId);

        if (deleteError) {
          setError("unknown_error");
          throw deleteError;
        }

        setSaved(false);
        return;
      }

      const { error: upsertError } = await supabase
        .from("saved_jobs")
        .upsert(
          { job_id: jobId, user_id: userId },
          { onConflict: "user_id,job_id" },
        );

      if (upsertError) {
        setError("unknown_error");
        throw upsertError;
      }

      setSaved(true);
    } finally {
      setBusy(false);
    }
  }, [busy, jobId, role, saved, userId]);

  return {
    saved,
    toggleSave,
    refreshSaved,
    loading,
    busy,
    error,
    canSave: !!userId && role === "job_seeker",
    isGuest: !userId,
    role,
    userId,
  };
}