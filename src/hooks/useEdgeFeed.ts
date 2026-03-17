import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFeedPage, PremiumState } from "../jobs/jobs.service";
import { JobWithCoords } from "../jobs/jobs.types";
import { JobsCursor } from "../jobs/jobs.cursor";

type Scope = "local" | "national";

type FeedError = string | null;

type FeedPageResult = {
  jobs: JobWithCoords[];
  nextCursor: JobsCursor | null;
  premium?: PremiumState | null;
  new_jobs_count?: number;
};

function classifyFeedError(err: unknown): string {
  const message =
    err instanceof Error
      ? err.message.toLowerCase()
      : String(err ?? "").toLowerCase();

  if (
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("timeout")
  ) {
    return "We could not refresh jobs right now. Check your internet connection and try again.";
  }

  return "We could not load jobs right now. Please try again.";
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
  const [new_jobs_count, setNewJobsCount] = useState<number>(0);
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

  const applyPage = useCallback((page: FeedPageResult) => {
    setJobs(page.jobs);
    setCursor(page.nextCursor ?? null);
    setPremium(page.premium ?? null);
    setHasMore(Boolean(page.nextCursor));
    setNewJobsCount(page.new_jobs_count ?? 0);
  }, []);

  const loadInitial = useCallback(async () => {
    if (!canFetch) {
      resetFeedState({ clearPremium: true });
      return;
    }

    const requestVersion = ++requestVersionRef.current;

    setLoading(true);
    setRefreshing(false);
    setLoadingMore(false);
    setError(null);

    try {
      const page = (await fetchFeedPage({
        locationId,
        cursor: null,
        requestedScope,
      })) as FeedPageResult;

      if (requestVersion !== requestVersionRef.current) return;

      applyPage(page);
    } catch (err) {
      if (requestVersion !== requestVersionRef.current) return;

      setJobs([]);
      setCursor(null);
      setHasMore(false);
      setNewJobsCount(0);
      setPremium(null);
      setError(classifyFeedError(err));
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoading(false);
      }
    }
  }, [applyPage, canFetch, locationId, requestedScope, resetFeedState]);

  const refresh = useCallback(async () => {
    if (!canFetch || loading || refreshing) return;

    const requestVersion = ++requestVersionRef.current;

    setRefreshing(true);
    setLoadingMore(false);
    setError(null);

    try {
      const page = (await fetchFeedPage({
        locationId,
        cursor: null,
        requestedScope,
      })) as FeedPageResult;

      if (requestVersion !== requestVersionRef.current) return;

      applyPage(page);
    } catch (err) {
      if (requestVersion !== requestVersionRef.current) return;

      setError(classifyFeedError(err));
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setRefreshing(false);
      }
    }
  }, [applyPage, canFetch, loading, locationId, refreshing, requestedScope]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || loading || refreshing || !canFetch) return;

    const requestVersion = requestVersionRef.current;

    setLoadingMore(true);
    setError(null);

    try {
      const page = (await fetchFeedPage({
        locationId,
        cursor,
        requestedScope,
      })) as FeedPageResult;

      if (requestVersion !== requestVersionRef.current) return;

      setJobs((prev) => {
        const seen = new Set(prev.map((j) => j.id));
        const next = page.jobs.filter((j) => !seen.has(j.id));
        return [...prev, ...next];
      });

      setCursor(page.nextCursor ?? null);
      setPremium(page.premium ?? null);
      setHasMore(Boolean(page.nextCursor));
    } catch (err) {
      if (requestVersion !== requestVersionRef.current) return;
      setError(classifyFeedError(err));
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
      resetFeedState({ clearPremium: true });
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