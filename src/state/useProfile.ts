import { useEffect, useState } from "react";
import { supabase } from "../core/supabase";
import type { Profile } from "../types/profile";

/* =====================================================
   GLOBAL PROFILE CACHE
===================================================== */

let cachedProfile: Profile | null = null;
let cachedUserId: string | null = null;
let fetching: Promise<void> | null = null;

/* =====================================================
   INTERNAL FETCH
===================================================== */

async function fetchProfile(userId: string) {
  if (cachedUserId === userId && cachedProfile) {
    return;
  }

  if (fetching) return fetching;

  fetching = (async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, phone_number, resolved_location_id, role, is_suspended")
      .eq("id", userId)
      .single();

    if (error) {
      cachedProfile = null;
      cachedUserId = userId;
      fetching = null;
      throw new Error("Profile not found");
    }

    cachedProfile = data as Profile;
    cachedUserId = userId;
    fetching = null;
  })();

  return fetching;
}

/* =====================================================
   CLEAR CACHE
===================================================== */

export function clearProfileCache() {
  cachedProfile = null;
  cachedUserId = null;
  fetching = null;
}

/* =====================================================
   HOOK
===================================================== */

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(
    userId && cachedUserId === userId ? cachedProfile : null
  );

  const [loading, setLoading] = useState<boolean>(!!userId && !profile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      clearProfileCache();
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    fetchProfile(userId)
      ?.then(() => {
        if (!active) return;

        setProfile(cachedProfile);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Account setup incomplete.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  /* =====================================================
     REALTIME PROFILE SYNC
  ===================================================== */

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          cachedProfile = payload.new as Profile;
          setProfile(cachedProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { profile, loading, error };
}
