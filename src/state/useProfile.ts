import { useEffect, useState } from "react";
import { supabase } from "../core/supabase";
import type { Profile, ProfileDB, UserRole } from "../types/profile";

type ProfileErrorCode =
  | "PROFILE_MISSING"
  | "PROFILE_SUSPENDED"
  | "PROFILE_ACCESS_DENIED"
  | "PROFILE_INVALID"
  | "PROFILE_RETRYABLE"
  | "PROFILE_UNKNOWN"
  | null;

type ProfileState = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  errorCode: ProfileErrorCode;
};

const profileCache = new Map<string, Profile>();
const fetchPromises = new Map<string, Promise<void>>();
const stateCache = new Map<string, ProfileState>();
const subscribers = new Map<string, Set<(state: ProfileState) => void>>();
const channels = new Map<string, ReturnType<typeof supabase.channel>>();
const requestVersions = new Map<string, number>();

const EMPTY_STATE: ProfileState = {
  profile: null,
  loading: false,
  error: null,
  errorCode: null,
};

const MISSING_PROFILE_MESSAGE = "Account setup incomplete.";
const SUSPENDED_MESSAGE = "Account suspended.";
const RETRYABLE_PROFILE_MESSAGE = "We could not load your account right now.";
const ACCESS_DENIED_MESSAGE = "We could not verify account access.";
const INVALID_PROFILE_MESSAGE = "We could not verify your account data.";
const UNKNOWN_PROFILE_MESSAGE = "We could not verify your account right now.";

function normalizeRole(value: unknown): UserRole | null {
  return value === "job_seeker" ||
    value === "employer" ||
    value === "moderator" ||
    value === "super_admin"
    ? value
    : null;
}

function toProfile(
  data: Pick<
    ProfileDB,
    | "id"
    | "full_name"
    | "phone_number"
    | "resolved_location_id"
    | "role"
    | "is_suspended"
  > | null | undefined,
): Profile | null {
  if (!data || typeof data.id !== "string" || data.id.trim().length === 0) {
    return null;
  }

  return {
    id: data.id,
    full_name: typeof data.full_name === "string" ? data.full_name : null,
    phone_number:
      typeof data.phone_number === "string" ? data.phone_number : null,
    resolved_location_id: data.resolved_location_id ?? null,
    role: normalizeRole(data.role),
    is_suspended: Boolean(data.is_suspended),
  };
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
    a.error === b.error &&
    a.errorCode === b.errorCode
  );
}

function getState(userId: string): ProfileState {
  const existing = stateCache.get(userId);
  if (existing) return existing;

  const initial: ProfileState = {
    profile: profileCache.get(userId) ?? null,
    loading: !profileCache.has(userId),
    error: null,
    errorCode: null,
  };

  stateCache.set(userId, initial);
  return initial;
}

function notify(userId: string, next: ProfileState) {
  const prev = getState(userId);
  if (isSameState(prev, next)) return;

  stateCache.set(userId, next);

  const userSubscribers = subscribers.get(userId);
  if (!userSubscribers || userSubscribers.size === 0) return;

  userSubscribers.forEach((cb) => cb(next));
}

function setProfileState(
  userId: string,
  profile: Profile | null,
  error: string | null,
  errorCode: ProfileErrorCode,
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
    errorCode,
    loading,
  });
}

function setLoading(userId: string, loading: boolean) {
  const prev = getState(userId);

  notify(userId, {
    profile: prev.profile,
    loading,
    error: loading ? null : prev.error,
    errorCode: loading ? null : prev.errorCode,
  });
}

function isRetryableError(code: ProfileErrorCode): boolean {
  return code === "PROFILE_RETRYABLE";
}

function classifyProfileError(error: unknown): {
  code: ProfileErrorCode;
  message: string;
} {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error ?? "").toLowerCase();

  if (
    message.includes("profile_not_found") ||
    message.includes("profile not found") ||
    message.includes("account setup incomplete")
  ) {
    return {
      code: "PROFILE_MISSING",
      message: MISSING_PROFILE_MESSAGE,
    };
  }

  if (
    message.includes("account_suspended") ||
    message.includes("suspended")
  ) {
    return {
      code: "PROFILE_SUSPENDED",
      message: SUSPENDED_MESSAGE,
    };
  }

  if (
    message.includes("jwt") ||
    message.includes("permission") ||
    message.includes("not allowed") ||
    message.includes("forbidden") ||
    message.includes("unauthorized") ||
    message.includes("rls") ||
    message.includes("profile_access_denied")
  ) {
    return {
      code: "PROFILE_ACCESS_DENIED",
      message: ACCESS_DENIED_MESSAGE,
    };
  }

  if (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("fetch") ||
    message.includes("failed to fetch")
  ) {
    return {
      code: "PROFILE_RETRYABLE",
      message: RETRYABLE_PROFILE_MESSAGE,
    };
  }

  if (
    message.includes("invalid input") ||
    message.includes("schema") ||
    message.includes("column") ||
    message.includes("null value") ||
    message.includes("constraint") ||
    message.includes("profile_invalid")
  ) {
    return {
      code: "PROFILE_INVALID",
      message: INVALID_PROFILE_MESSAGE,
    };
  }

  return {
    code: "PROFILE_UNKNOWN",
    message: UNKNOWN_PROFILE_MESSAGE,
  };
}

function nextRequestVersion(userId: string): number {
  const next = (requestVersions.get(userId) ?? 0) + 1;
  requestVersions.set(userId, next);
  return next;
}

function invalidateRequests(userId: string) {
  requestVersions.set(userId, (requestVersions.get(userId) ?? 0) + 1);
}

function isActiveRequest(userId: string, version: number): boolean {
  return requestVersions.get(userId) === version;
}

async function fetchProfile(userId: string): Promise<void> {
  if (fetchPromises.has(userId)) {
    return fetchPromises.get(userId)!;
  }

  const promise = (async () => {
    const version = nextRequestVersion(userId);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            phone_number,
            resolved_location_id,
            role,
            is_suspended
          `)
          .eq("id", userId)
          .maybeSingle();

        if (!isActiveRequest(userId, version)) return;
        if (error) throw error;

        const profile = toProfile(data);

        if (!profile) {
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 150));
            if (!isActiveRequest(userId, version)) return;
            continue;
          }

          setProfileState(
            userId,
            null,
            MISSING_PROFILE_MESSAGE,
            "PROFILE_MISSING",
            false,
          );
          return;
        }

        if (!profile.role) {
          setProfileState(
            userId,
            null,
            INVALID_PROFILE_MESSAGE,
            "PROFILE_INVALID",
            false,
          );
          return;
        }

        setProfileState(
          userId,
          profile,
          profile.is_suspended ? SUSPENDED_MESSAGE : null,
          profile.is_suspended ? "PROFILE_SUSPENDED" : null,
          false,
        );
        return;
      } catch (error) {
        if (!isActiveRequest(userId, version)) return;

        const classified = classifyProfileError(error);
        setProfileState(
          userId,
          null,
          classified.message,
          classified.code,
          false,
        );
        return;
      }
    }
  })();

  fetchPromises.set(userId, promise);

  try {
    await promise;
  } finally {
    if (fetchPromises.get(userId) === promise) {
      fetchPromises.delete(userId);
    }
  }
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
          invalidateRequests(userId);
          profileCache.delete(userId);

          notify(userId, {
            profile: null,
            loading: false,
            error: MISSING_PROFILE_MESSAGE,
            errorCode: "PROFILE_MISSING",
          });
          return;
        }

        const updated = toProfile(
          payload.new as Pick<
            ProfileDB,
            | "id"
            | "full_name"
            | "phone_number"
            | "resolved_location_id"
            | "role"
            | "is_suspended"
          >,
        );

        if (!updated || !updated.role) {
          invalidateRequests(userId);
          profileCache.delete(userId);

          notify(userId, {
            profile: null,
            loading: false,
            error: INVALID_PROFILE_MESSAGE,
            errorCode: "PROFILE_INVALID",
          });
          return;
        }

        invalidateRequests(userId);
        profileCache.set(userId, updated);

        notify(userId, {
          profile: updated,
          loading: false,
          error: updated.is_suspended ? SUSPENDED_MESSAGE : null,
          errorCode: updated.is_suspended ? "PROFILE_SUSPENDED" : null,
        });
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
    requestVersions.delete(userId);
    stateCache.set(userId, EMPTY_STATE);

    const channel = channels.get(userId);
    if (channel) {
      channels.delete(userId);
      void supabase.removeChannel(channel);
    }

    const userSubscribers = subscribers.get(userId);
    if (userSubscribers) {
      userSubscribers.forEach((cb) => cb(EMPTY_STATE));
    }

    return;
  }

  profileCache.clear();
  fetchPromises.clear();
  requestVersions.clear();
  stateCache.clear();

  channels.forEach((channel) => {
    void supabase.removeChannel(channel);
  });
  channels.clear();

  subscribers.forEach((userSubscribers, id) => {
    stateCache.set(id, EMPTY_STATE);
    userSubscribers.forEach((cb) => cb(EMPTY_STATE));
  });
}

export function useProfile(userId: string | null) {
  const [state, setState] = useState<ProfileState>(() => {
    if (!userId) return EMPTY_STATE;
    return getState(userId);
  });

  useEffect(() => {
    if (!userId) {
      setState(EMPTY_STATE);
      return;
    }

    let active = true;

    const handler = (next: ProfileState) => {
      if (!active) return;
      setState((prev) => (isSameState(prev, next) ? prev : next));
    };

    const userSubscribers = subscribers.get(userId) ?? new Set();
    userSubscribers.add(handler);
    subscribers.set(userId, userSubscribers);

    const current = getState(userId);
    setState(current);

    ensureRealtimeSubscription(userId);

    if (!profileCache.has(userId) && !fetchPromises.has(userId)) {
      setLoading(userId, true);
      void fetchProfile(userId);
    } else if (isRetryableError(current.errorCode) && !fetchPromises.has(userId)) {
      setLoading(userId, true);
      void fetchProfile(userId);
    } else if (profileCache.has(userId)) {
      const cached = profileCache.get(userId) ?? null;

      notify(userId, {
        profile: cached,
        loading: false,
        error: cached?.is_suspended ? SUSPENDED_MESSAGE : null,
        errorCode: cached?.is_suspended ? "PROFILE_SUSPENDED" : null,
      });
    }

    return () => {
      active = false;

      const currentSubscribers = subscribers.get(userId);
      if (currentSubscribers) {
        currentSubscribers.delete(handler);

        if (currentSubscribers.size === 0) {
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
    errorCode: state.errorCode,
    role: state.profile?.role ?? null,
    isSuspended: state.profile?.is_suspended ?? false,
  };
}