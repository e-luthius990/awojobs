import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "../core/supabase";
import { getDeviceHash } from "../security/device";
import { ENV } from "../core/config";

type PremiumState = {
  active: boolean;
  expires_at: string | null;
  days_remaining: number;
  scope: "local" | "national";
  phone: string | null;
};

type FeedResponse = {
  premium: PremiumState;
  jobs: any[];
  new_jobs_count?: number;
};

const REQUEST_TIMEOUT_MS = 8000;

export function useEdgeFeed(locationId: string | null) {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const deviceHashRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  /* ---------------- INIT DEVICE HASH ---------------- */

  useEffect(() => {
    let mounted = true;

    (async () => {
      const hash = await getDeviceHash().catch(() => null);
      if (mounted) deviceHashRef.current = hash;
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- CORE FETCH ---------------- */

  const fetchFeed = useCallback(async () => {
    if (!locationId || !deviceHashRef.current) return;

    const currentRequestId = ++requestIdRef.current;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token ?? null;

      const timeout = setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      const res = await fetch(
        `${ENV.SUPABASE_URL}/functions/v1/feed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && {
              Authorization: `Bearer ${token}`,
            }),
          },
          body: JSON.stringify({
            location_id: locationId,
            device_hash: deviceHashRef.current,
            limit: 20,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error("feed_error");
      }

      const json: FeedResponse = await res.json();

      if (currentRequestId === requestIdRef.current) {
        setData(json);
      }
    } catch {
      // keep previous state silently
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [locationId]);

  /* ---------------- AUTO FETCH ---------------- */

  useEffect(() => {
    if (!locationId) return;
    fetchFeed();
  }, [locationId, fetchFeed]);

  /* ---------------- REALTIME JOB INSERT ---------------- */

  useEffect(() => {
    if (!locationId) return;

    const channel = supabase
      .channel(`feed-refresh-${locationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jobs",
        },
        fetchFeed
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId, fetchFeed]);

  /* ---------------- PREMIUM EXPIRY TIMER ---------------- */

  useEffect(() => {
    if (!data?.premium?.expires_at) return;

    const expiryTime = new Date(data.premium.expires_at).getTime();
    const now = Date.now();

    if (expiryTime <= now) {
      fetchFeed();
      return;
    }

    const timeout = setTimeout(() => {
      fetchFeed(); // auto downgrade to local
    }, expiryTime - now + 1000);

    return () => clearTimeout(timeout);
  }, [data?.premium?.expires_at, fetchFeed]);

  /* ---------------- STABLE DERIVED ---------------- */

  const premium = useMemo<PremiumState>(() => {
    return (
      data?.premium ?? {
        active: false,
        expires_at: null,
        days_remaining: 0,
        scope: "local",
        phone: null,
      }
    );
  }, [data]);

  const jobs = useMemo(() => data?.jobs ?? [], [data]);

  return {
    jobs,
    premium,
    loading,
    refresh: fetchFeed,
    new_jobs_count: data?.new_jobs_count ?? 0,
  };
}
