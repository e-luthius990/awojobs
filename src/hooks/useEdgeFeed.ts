import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFeedPage, type PremiumState } from "../jobs/jobs.service";
import type { JobWithCoords } from "../jobs/jobs.types";
import type { JobsCursor } from "../jobs/jobs.cursor";

type Scope = "local" | "national";
type FeedError = string | null;

type FeedPageResult = {
  jobs: JobWithCoords[];
  nextCursor: JobsCursor | null;
  premium?: PremiumState | null;
  new_jobs_count?: number;
};

type AppErrorCode =
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

type AppError = {
  code: AppErrorCode;
  message: string;
  retryable: boolean;
  fieldErrors?: Record<string, string>;
};

type FeedServiceResult =
  | { ok: true; data: FeedPageResult }
  | { ok: false; error: AppError };

function classifyFeedError(error: AppError): string {
  switch (error.code) {
    case "NETWORK_ERROR":
      return "We could not refresh jobs right now. Check your internet connection and try again.";
    case "SESSION_EXPIRED":
    case "AUTH_REQUIRED":
      return "We could not verify your session. Please reopen the app and try again.";
    case "FORBIDDEN":
      return "You do not have access to this feed right now.";
    case "NOT_FOUND":
      return "We could not load your feed profile right now.";
    case "VALIDATION_ERROR":
      if (error.fieldErrors?.location_id) {
        return "We could not use your selected location. Please choose it again.";
      }
      if (error.fieldErrors?.requested_scope) {
        return "The selected feed scope is invalid.";
      }
      if (error.fieldErrors?.device_hash) {
        return "We could not secure this request. Please reopen the app and try again.";
      }
      if (error.fieldErrors?.cursor) {
        return "We could not continue loading more jobs. Please refresh and try again.";
      }
      return error.message || "Some feed settings are invalid.";
    case "RATE_LIMITED":
      return "You’re refreshing too quickly. Please wait a moment.";
    case "UNKNOWN_ERROR":
    default:
      return error.message || "We could not load jobs right now. Please try again.";
  }
}

function isValidCursor(value: unknown): value is JobsCursor {
  if (!value || typeof value !== "object") return false;

  const cursor = value as Partial<JobsCursor>;

  return (
    typeof cursor.is_currently_sponsored === "boolean" &&
    (cursor.sponsored_until === null ||
      cursor.sponsored_until === undefined ||
      typeof cursor.sponsored_until === "string") &&
    typeof cursor.created_at === "string" &&
    cursor.created_at.trim().length > 0 &&
    typeof cursor.id === "string" &&
    cursor.id.trim().length > 0
  );
}

function isValidPremiumState(value: unknown): value is PremiumState {
  if (!value || typeof value !== "object") return false;

  const premium = value as Partial<PremiumState>;

  return (
    typeof premium.active === "boolean" &&
    (premium.scope === "local" || premium.scope === "national") &&
    (premium.requested_scope === "local" ||
      premium.requested_scope === "national") &&
    typeof premium.can_access_national === "boolean"
  );
}

function normalizeFeedPage(input: unknown): FeedPageResult {
  const page = (input ?? {}) as Partial<FeedPageResult>;

  return {
    jobs: Array.isArray(page.jobs) ? page.jobs : [],
    nextCursor: isValidCursor(page.nextCursor) ? page.nextCursor : null,
    premium: isValidPremiumState(page.premium) ? page.premium : null,
    new_jobs_count:
      typeof page.new_jobs_count === "number" &&
      Number.isFinite(page.new_jobs_count)
        ? Math.max(0, Math.trunc(page.new_jobs_count))
        : 0,
  };
}

export function useEdgeFeed(
  locationId: string | null,
  requestedScope: Scope = "local",
) {
  const [jobs, setJobs] = useState<JobWithCoords[]>([]);
  const [premium, setPremium] = useState<PremiumState | null>(null);
  const [cursor, setCursor] = useState<JobsCursor | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [new_jobs_count, setNewJobsCount] = useState(0);
  const [error, setError] = useState<FeedError>(null);

  const requestVersionRef = useRef(0);

  const requiresLocation = requestedScope === "local";
  const canFetch = !requiresLocation || Boolean(locationId);

  const resetFeedState = useCallback(
    (options?: { clearPremium?: boolean }) => {
      setJobs([]);
      setCursor(null);
      setHasMore(false);
      setNewJobsCount(0);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);

      if (options?.clearPremium) {
        setPremium(null);
      }
    },
    [],
  );

  const applyInitialPage = useCallback((page: FeedPageResult) => {
    setJobs(page.jobs);
    setCursor(page.nextCursor);
    setHasMore(Boolean(page.nextCursor));
    setNewJobsCount(page.new_jobs_count ?? 0);
    setPremium(page.premium ?? null);
  }, []);

  const fetchFirstPage = useCallback(async (): Promise<FeedServiceResult> => {
    const result = await fetchFeedPage({
      locationId,
      cursor: null,
      requestedScope,
    });

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      data: normalizeFeedPage(result.data),
    };
  }, [locationId, requestedScope]);

  const loadInitial = useCallback(async () => {
    if (!canFetch) {
      resetFeedState({ clearPremium: false });
      return;
    }

    const requestVersion = ++requestVersionRef.current;

    setLoading(true);
    setRefreshing(false);
    setLoadingMore(false);
    setError(null);

    try {
      const result = await fetchFirstPage();

      if (requestVersion !== requestVersionRef.current) return;

      if (!result.ok) {
        setJobs([]);
        setCursor(null);
        setHasMore(false);
        setNewJobsCount(0);
        setPremium(null);
        setError(classifyFeedError(result.error));
        return;
      }

      applyInitialPage(result.data);
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoading(false);
      }
    }
  }, [applyInitialPage, canFetch, fetchFirstPage, resetFeedState]);

  const refresh = useCallback(async () => {
    if (!canFetch || loading || refreshing) return;

    const requestVersion = ++requestVersionRef.current;

    setRefreshing(true);
    setLoadingMore(false);
    setError(null);

    try {
      const result = await fetchFirstPage();

      if (requestVersion !== requestVersionRef.current) return;

      if (!result.ok) {
        setError(classifyFeedError(result.error));
        return;
      }

      applyInitialPage(result.data);
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setRefreshing(false);
      }
    }
  }, [applyInitialPage, canFetch, fetchFirstPage, loading, refreshing]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || loading || refreshing || !canFetch) {
      return;
    }

    const requestVersion = requestVersionRef.current;
    const currentCursor = cursor;

    setLoadingMore(true);

    try {
      const result = await fetchFeedPage({
        locationId,
        cursor: currentCursor,
        requestedScope,
      });

      if (requestVersion !== requestVersionRef.current) return;

      if (!result.ok) {
        setError(classifyFeedError(result.error));
        return;
      }

      const page = normalizeFeedPage(result.data);

      setJobs((prev) => {
        const seen = new Set(prev.map((job) => job.id));
        const next = page.jobs.filter((job) => !seen.has(job.id));
        return [...prev, ...next];
      });

      setCursor(page.nextCursor);
      setHasMore(Boolean(page.nextCursor));
      setPremium(page.premium ?? null);
      setNewJobsCount(page.new_jobs_count ?? 0);
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoadingMore(false);
      }
    }
  }, [
    canFetch,
    cursor,
    loading,
    loadingMore,
    locationId,
    refreshing,
    requestedScope,
  ]);

  useEffect(() => {
    if (!canFetch) {
      resetFeedState({ clearPremium: false });
      return;
    }

    setCursor(null);
    setHasMore(false);
    setNewJobsCount(0);
    setError(null);
    setLoadingMore(false);

    void loadInitial();
  }, [canFetch, loadInitial, resetFeedState]);

  return {
    jobs,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
    premium,
    new_jobs_count,
    error,
  };
}