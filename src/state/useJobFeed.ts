import { useEffect, useRef, useState } from "react";
import { Job } from "../jobs/jobs.types";
import { fetchJobsForLocationCursor } from "../jobs/jobs.service";
import { JobsCursor } from "../jobs/jobs.cursor";
import { jobFreshnessScore } from "../jobs/jobs.freshness";

/* ---------------------------------------------
   HELPERS
---------------------------------------------- */

function sortJobs(jobs: Job[]) {
  return [...jobs].sort((a, b) => {
    const scoreDiff =
      jobFreshnessScore(b) - jobFreshnessScore(a);

    if (scoreDiff !== 0) return scoreDiff;

    // Stable fallback: newest first
    return (
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
    );
  });
}

function dedupe(existing: Job[], incoming: Job[]) {
  const seen = new Set(existing.map(j => j.id));
  return incoming.filter(j => !seen.has(j.id));
}

/* ---------------------------------------------
   HOOK
---------------------------------------------- */

export function useJobFeed(locationId: string | null) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cursor, setCursor] = useState<JobsCursor | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);

  const mounted = useRef(true);

  /* ---------------------------------------------
     RESET ON LOCATION CHANGE
  ---------------------------------------------- */
  useEffect(() => {
    if (!locationId) return;

    mounted.current = true;

    setJobs([]);
    setCursor(null);
    setPendingJobs([]);
    setHasMore(true);

    loadInitial();

    return () => {
      mounted.current = false;
    };
  }, [locationId]);

  /* ---------------------------------------------
     INITIAL LOAD
  ---------------------------------------------- */
  async function loadInitial() {
    setLoading(true);
    try {
      const page = await fetchJobsForLocationCursor(locationId!);
      if (!mounted.current) return;

      setJobs(sortJobs(page.jobs));
      setCursor(page.nextCursor);
      setHasMore(Boolean(page.nextCursor));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  /* ---------------------------------------------
     LOAD MORE (OLDER JOBS)
  ---------------------------------------------- */
  async function loadMore() {
    if (!locationId || !cursor || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const page = await fetchJobsForLocationCursor(
        locationId,
        cursor,
        "older"
      );

      if (!mounted.current) return;

      setJobs(prev =>
        sortJobs([...prev, ...dedupe(prev, page.jobs)])
      );
      setCursor(page.nextCursor);
      setHasMore(Boolean(page.nextCursor));
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  }

  /* ---------------------------------------------
     SCAN NEW (SILENT, NON-DESTRUCTIVE)
  ---------------------------------------------- */
  async function scanNew() {
    if (!locationId || jobs.length === 0 || loading) return;

    setLoading(true);
    try {
      const newest = jobs[0];

      const page = await fetchJobsForLocationCursor(
        locationId,
        { created_at: newest.created_at, id: newest.id },
        "newer"
      );

      if (!mounted.current || page.jobs.length === 0) return;

      const fresh = dedupe(jobs, page.jobs);

      if (fresh.length) {
        setPendingJobs(prev =>
          sortJobs([...prev, ...fresh])
        );
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  /* ---------------------------------------------
     APPLY NEW JOBS (USER CONFIRMED)
  ---------------------------------------------- */
  function applyNew() {
    if (!pendingJobs.length) return;

    setJobs(prev =>
      sortJobs([...pendingJobs, ...prev])
    );
    setPendingJobs([]);
  }

  return {
    jobs,

    loading,
    loadingMore,
    hasMore,

    loadMore,

    scanNew,
    pendingCount: pendingJobs.length,
    applyNew,
  };
}
