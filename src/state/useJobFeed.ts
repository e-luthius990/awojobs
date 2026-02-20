import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { JobWithCoords } from "../jobs/jobs.types";
import { getDeviceHash } from "../security/device";
import { supabaseAnon } from "../core/supabaseAnon";
import { ENV } from "../env";

/* =====================================================
   CONFIG
===================================================== */

const REQUEST_TIMEOUT_MS = 10000;

/* =====================================================
   SIMPLE FEED CACHE (SAFE SUBSET)
   Keyed by location + scope
===================================================== */

const feedCache = new Map<
  string,
  { jobs: JobWithCoords[]; premium: any }
>();

/* =====================================================
   INTERNAL HELPERS
===================================================== */

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error("Feed request timed out."));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

/* =====================================================
   HOOK
===================================================== */

type PremiumState = {
  active: boolean;
  expires_at: string | null;
  days_remaining: number;
  scope: "local" | "national";
  phone: string | null;
};

export function useJobFeed(locationId: string | null) {
  const [jobs, setJobs] = useState<JobWithCoords[]>([]);
  const [loading, setLoading] = useState(false);
  const [premium, setPremium] = useState<PremiumState | null>(null);
  const [requestedScope, setRequestedScope] =
    useState<"local" | "national">("local");

  const deviceHashRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const channelRef = useRef<any>(null);
  const cursorRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  /* ---------------- INIT DEVICE HASH ---------------- */

  useEffect(() => {
    (async () => {
      deviceHashRef.current = await getDeviceHash();
    })();
  }, []);

  /* ---------------- CACHE KEY ---------------- */

  const cacheKey = useMemo(() => {
    if (!locationId) return null;
    return `${locationId}-${requestedScope}`;
  }, [locationId, requestedScope]);

  /* ---------------- FETCH FEED (CURSOR SAFE) ---------------- */

  const fetchFeed = useCallback(
    async (opts?: { append?: boolean }) => {
      if (!locationId || !deviceHashRef.current) return;

      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      const append = opts?.append ?? false;

      if (!append) setLoading(true);

      try {
        const session = await supabaseAnon.auth.getSession();
        const token = session.data.session?.access_token;

        const res = await withTimeout(
          fetch(`${ENV.SUPABASE_URL}/functions/v1/feed`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              location_id: locationId,
              device_hash: deviceHashRef.current,
              limit: 20,
              requested_scope: requestedScope,
              cursor: append ? cursorRef.current : null,
            }),
            signal: controller.signal,
          })
        );

        if (!res.ok) {
          throw new Error("Feed failed");
        }

        const data = await res.json();

        if (!isMountedRef.current) return;

        const newJobs: JobWithCoords[] = data.jobs ?? [];

        cursorRef.current = data.next_cursor ?? null;

        setJobs((prev) =>
          append ? [...prev, ...newJobs] : newJobs
        );

        setPremium(data.premium ?? null);

        if (
          requestedScope === "national" &&
          data.premium?.scope !== "national"
        ) {
          setRequestedScope("local");
        }

        if (cacheKey) {
          feedCache.set(cacheKey, {
            jobs: append ? [...jobs, ...newJobs] : newJobs,
            premium: data.premium ?? null,
          });
        }
      } catch (err) {
        if (__DEV__) {
          console.warn("[useJobFeed] Fetch error");
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [locationId, requestedScope, cacheKey]
  );

  /* ---------------- INITIAL LOAD + CACHE HYDRATION ---------------- */

  useEffect(() => {
    if (!locationId || !cacheKey) return;

    isMountedRef.current = true;

    const cached = feedCache.get(cacheKey);

    if (cached) {
      setJobs(cached.jobs);
      setPremium(cached.premium);
      setLoading(false);
    } else {
      setJobs([]);
      fetchFeed();
    }

    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [locationId, requestedScope]);

  /* ---------------- REALTIME (PRECISE) ---------------- */

  useEffect(() => {
    if (!locationId) return;

    if (channelRef.current) {
      supabaseAnon.removeChannel(channelRef.current);
    }

    const channel = supabaseAnon
      .channel(`feed-${locationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
        },
        () => {
          // Refresh silently without blocking UI
          fetchFeed();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabaseAnon.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [locationId, requestedScope, fetchFeed]);

  /* ---------------- PAGINATION ---------------- */

  const loadMore = useCallback(() => {
    if (!cursorRef.current || loading) return;
    fetchFeed({ append: true });
  }, [loading, fetchFeed]);

  return {
    jobs,
    loading,
    premium,
    requestedScope,
    setRequestedScope,
    refresh: fetchFeed,
    loadMore,
  };
}
