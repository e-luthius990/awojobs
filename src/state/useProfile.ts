import { useEffect, useState } from "react";
import { supabase } from "../core/supabase";
import type { Profile } from "../types/profile";

type ProfileState = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
};

const profileCache = new Map<string, Profile>();
const fetchPromises = new Map<string, Promise<void>>();
const stateCache = new Map<string, ProfileState>();
const subscribers = new Map<string, Set<(state: ProfileState) => void>>();
const channels = new Map<string, ReturnType<typeof supabase.channel>>();

let signOutPromise: Promise<void> | null = null;

const MISSING_PROFILE_MESSAGE = "Account setup incomplete.";
const SUSPENDED_MESSAGE = "Account suspended.";
const RETRYABLE_PROFILE_MESSAGE = "We could not load your account right now.";

function toProfile(data: Partial<Profile> | null | undefined): Profile | null {
  if (!data?.id) return null;

  return {
    id: data.id,
    full_name: data.full_name ?? "",
    phone_number: data.phone_number ?? "",
    resolved_location_id: data.resolved_location_id ?? null,
    role: data.role ?? "job_seeker",
    is_suspended: Boolean(data.is_suspended),
  } as Profile;
}

function getState(userId: string): ProfileState {
  const existing = stateCache.get(userId);
  if (existing) return existing;

  const initial: ProfileState = {
    profile: profileCache.get(userId) ?? null,
    loading: !profileCache.has(userId),
    error: null,
  };

  stateCache.set(userId, initial);
  return initial;
}

function isSameProfile(a: Profile | null, b: Profile | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.id === b.id &&
    a.full_name === b.full_name &&
    a.phone_number === b.phone_number &&
    a.resolved_location_id === b.resolved_location_id &&
    a.role === b.role &&
    a.is_suspended === b.is_suspended
  );
}

function isSameState(a: ProfileState, b: ProfileState): boolean {
  return (
    isSameProfile(a.profile, b.profile) &&
    a.loading === b.loading &&
    a.error === b.error
  );
}

function notify(userId: string, next: ProfileState) {
  const prev = getState(userId);
  if (isSameState(prev, next)) return;

  stateCache.set(userId, next);

  const userSubscribers = subscribers.get(userId);
  if (!userSubscribers || userSubscribers.size === 0) return;

  userSubscribers.forEach((cb) => cb(next));
}

function setLoading(userId: string, loading: boolean) {
  const prev = getState(userId);
  notify(userId, { ...prev, loading });
}

function setProfileState(
  userId: string,
  profile: Profile | null,
  error: string | null,
  loading: boolean,
) {
  if (profile) {
    profileCache.set(userId, profile);
  } else {
    profileCache.delete(userId);
  }

  notify(userId, {
    profile,
    error,
    loading,
  });
}

function classifyProfileError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  if (message.includes("profile not found")) {
    return MISSING_PROFILE_MESSAGE;
  }

  if (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("fetch") ||
    message.includes("failed to fetch")
  ) {
    return RETRYABLE_PROFILE_MESSAGE;
  }

  return RETRYABLE_PROFILE_MESSAGE;
}

async function safeSignOutOnce() {
  if (signOutPromise) return signOutPromise;

  signOutPromise = (async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      signOutPromise = null;
    }
  })();

  return signOutPromise;
}

async function fetchProfile(userId: string, retry = 0): Promise<void> {
  if (profileCache.has(userId)) {
    setProfileState(userId, profileCache.get(userId) ?? null, null, false);
    return;
  }

  if (fetchPromises.has(userId)) {
    return fetchPromises.get(userId)!;
  }

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          full_name,
          phone_number,
          resolved_location_id,
          role,
          is_suspended
          `,
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const profile = toProfile(data);

      if (!profile) {
        if (retry < 1) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          fetchPromises.delete(userId);
          return fetchProfile(userId, retry + 1);
        }

        setProfileState(userId, null, MISSING_PROFILE_MESSAGE, false);
        return;
      }

      setProfileState(userId, profile, null, false);

      if (profile.is_suspended) {
        notify(userId, {
          profile,
          loading: false,
          error: SUSPENDED_MESSAGE,
        });
        void safeSignOutOnce();
      }
    } catch (error) {
      const message = classifyProfileError(error);
      setProfileState(userId, null, message, false);
    } finally {
      fetchPromises.delete(userId);
    }
  })();

  fetchPromises.set(userId, promise);
  return promise;
}

function ensureRealtimeSubscription(userId: string) {
  if (channels.has(userId)) return;

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
        if (payload.eventType === "DELETE") {
          profileCache.delete(userId);
          notify(userId, {
            profile: null,
            loading: false,
            error: MISSING_PROFILE_MESSAGE,
          });
          void safeSignOutOnce();
          return;
        }

        const updated = toProfile(payload.new as Partial<Profile>);
        if (!updated) return;

        profileCache.set(userId, updated);

        notify(userId, {
          profile: updated,
          loading: false,
          error: updated.is_suspended ? SUSPENDED_MESSAGE : null,
        });

        if (updated.is_suspended) {
          void safeSignOutOnce();
        }
      },
    )
    .subscribe();

  channels.set(userId, channel);
}

function cleanupRealtimeSubscriptionIfUnused(userId: string) {
  const userSubscribers = subscribers.get(userId);
  if (userSubscribers && userSubscribers.size > 0) return;

  const channel = channels.get(userId);
  if (!channel) return;

  channels.delete(userId);
  void supabase.removeChannel(channel);
}

export function clearProfileCache(userId?: string) {
  if (userId) {
    profileCache.delete(userId);
    fetchPromises.delete(userId);
    stateCache.delete(userId);

    const channel = channels.get(userId);
    if (channel) {
      channels.delete(userId);
      void supabase.removeChannel(channel);
    }

    subscribers.delete(userId);
    return;
  }

  profileCache.clear();
  fetchPromises.clear();
  stateCache.clear();

  channels.forEach((channel) => {
    void supabase.removeChannel(channel);
  });
  channels.clear();

  subscribers.clear();
}

export function useProfile(userId: string | null) {
  const [state, setState] = useState<ProfileState>(() => {
    if (!userId) {
      return {
        profile: null,
        loading: false,
        error: null,
      };
    }

    return getState(userId);
  });

  useEffect(() => {
    if (!userId) {
      setState({
        profile: null,
        loading: false,
        error: null,
      });
      return;
    }

    let active = true;

    const handler = (next: ProfileState) => {
      if (!active) return;
      setState((prev) => (isSameState(prev, next) ? prev : next));
    };

    const existingSubscribers = subscribers.get(userId) ?? new Set();
    existingSubscribers.add(handler);
    subscribers.set(userId, existingSubscribers);

    setState(getState(userId));

    ensureRealtimeSubscription(userId);

    if (!profileCache.has(userId) && !fetchPromises.has(userId)) {
      setLoading(userId, true);
      void fetchProfile(userId);
    } else if (profileCache.has(userId)) {
      const cached = profileCache.get(userId) ?? null;
      notify(userId, {
        profile: cached,
        loading: false,
        error: cached?.is_suspended ? SUSPENDED_MESSAGE : null,
      });

      if (cached?.is_suspended) {
        void safeSignOutOnce();
      }
    }

    return () => {
      active = false;

      const userSubscribers = subscribers.get(userId);
      if (userSubscribers) {
        userSubscribers.delete(handler);

        if (userSubscribers.size === 0) {
          subscribers.delete(userId);
        }
      }

      cleanupRealtimeSubscriptionIfUnused(userId);
    };
  }, [userId]);

  return {
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    role: state.profile?.role ?? null,
    isSuspended: state.profile?.is_suspended ?? false,
  };
}