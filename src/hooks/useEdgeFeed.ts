import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchFeedPage,
  type PremiumState,
  type FeedResolutionLevel,
} from "../jobs/jobs.service";
import type { JobWithCoords } from "../jobs/jobs.types";
import type { JobsCursor } from "../jobs/jobs.cursor";
import type { ResolvedLocation } from "../location/location.types";

type Scope = "local" | "national";
type FeedError = string | null;

type FeedPageResult = {
  jobs: JobWithCoords[];
  nextCursor: JobsCursor | null;
  premium?: PremiumState | null;
  new_jobs_count?: number;
  effective_scope: "local" | "national";
  resolution_level: FeedResolutionLevel;
  display_location_label: string | null;
  coverage_note: string | null;
};

type AppErrorCode =
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "OUTSIDE_SUPPORTED_COUNTRY"
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
    case "OUTSIDE_SUPPORTED_COUNTRY":
      return "Nearby jobs are only available when your device is detected inside Uganda.";
    case "VALIDATION_ERROR":
      if (
        error.fieldErrors?.location_id ||
        error.fieldErrors?.district_id ||
        error.fieldErrors?.resolved_location
      ) {
        return "We could not match your current area right now.";
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

function isValidScope(value: unknown): value is "local" | "national" {
  return value === "local" || value === "national";
}

function isValidResolutionLevel(value: unknown): value is FeedResolutionLevel {
  return (
    value === "exact_local" ||
    value === "area_local" ||
    value === "district_only" ||
    value === "uganda_only" ||
    value === "outside_uganda" ||
    value === null
  );
}

function normalizeFeedPage(
  input: unknown,
  requestedScope: Scope,
): FeedPageResult {
  const page = (input ?? {}) as Partial<FeedPageResult>;

  const premium = isValidPremiumState(page.premium) ? page.premium : null;

  return {
    jobs: Array.isArray(page.jobs) ? page.jobs : [],
    nextCursor: isValidCursor(page.nextCursor) ? page.nextCursor : null,
    premium,
    new_jobs_count:
      typeof page.new_jobs_count === "number" && Number.isFinite(page.new_jobs_count)
        ? Math.max(0, Math.trunc(page.new_jobs_count))
        : 0,
    effective_scope: isValidScope(page.effective_scope)
      ? page.effective_scope
      : premium?.scope ?? requestedScope,
    resolution_level: isValidResolutionLevel(page.resolution_level)
      ? page.resolution_level
      : null,
    display_location_label:
      typeof page.display_location_label === "string"
        ? page.display_location_label
        : null,
    coverage_note:
      typeof page.coverage_note === "string" ? page.coverage_note : null,
  };
}

function shouldClearPremiumForScope(scope: Scope) {
  return scope === "national";
}

type LocalFeedTarget =
  | {
      kind: "exact_local";
      locationId: string;
      districtId: string;
      displayLabel: string | null;
      resolutionLevel: "exact_local";
    }
  | {
      kind: "area_local";
      locationId: string;
      districtId: string;
      displayLabel: string | null;
      resolutionLevel: "area_local";
    }
  | {
      kind: "district_only";
      districtId: string;
      displayLabel: string | null;
      resolutionLevel: "district_only";
    }
  | null;

function getLocalFeedTarget(
  resolvedLocation: ResolvedLocation | null,
): LocalFeedTarget {
  if (!resolvedLocation) return null;
  if (!resolvedLocation.is_within_uganda) return null;

  if (
    resolvedLocation.resolution_level === "exact_local" &&
    resolvedLocation.location_id &&
    resolvedLocation.district_id
  ) {
    return {
      kind: "exact_local",
      locationId: resolvedLocation.location_id,
      districtId: resolvedLocation.district_id,
      displayLabel: resolvedLocation.display_label,
      resolutionLevel: "exact_local",
    };
  }

  if (
    resolvedLocation.resolution_level === "area_local" &&
    resolvedLocation.location_id &&
    resolvedLocation.district_id
  ) {
    return {
      kind: "area_local",
      locationId: resolvedLocation.location_id,
      districtId: resolvedLocation.district_id,
      displayLabel: resolvedLocation.display_label,
      resolutionLevel: "area_local",
    };
  }

  if (
    resolvedLocation.resolution_level === "district_only" &&
    resolvedLocation.district_id
  ) {
    return {
      kind: "district_only",
      districtId: resolvedLocation.district_id,
      displayLabel: resolvedLocation.display_label,
      resolutionLevel: "district_only",
    };
  }

  return null;
}

type FeedRequestInput = {
  requestedScope: Scope;
  cursor: JobsCursor | null;
  locationId: string | null;
  districtId: string | null;
};

export function useEdgeFeed(
  resolvedLocation: ResolvedLocation | null,
  requestedScope: Scope = "local",
) {
  const [jobs, setJobs] = useState<JobWithCoords[]>([]);
  const [premium, setPremium] = useState<PremiumState | null>(null);
  const [cursor, setCursor] = useState<JobsCursor | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [newJobsCount, setNewJobsCount] = useState(0);
  const [error, setError] = useState<FeedError>(null);

  const [effectiveScope, setEffectiveScope] = useState<Scope>(requestedScope);
  const [resolutionLevel, setResolutionLevel] =
    useState<FeedResolutionLevel>(null);
  const [displayLocationLabel, setDisplayLocationLabel] = useState<string | null>(
    null,
  );
  const [coverageNote, setCoverageNote] = useState<string | null>(null);

  const requestVersionRef = useRef(0);
  const lastBootKeyRef = useRef<string | null>(null);
  const jobsRef = useRef<JobWithCoords[]>([]);

  const localFeedTarget = useMemo(
    () => getLocalFeedTarget(resolvedLocation),
    [resolvedLocation],
  );

  const canFetch = useMemo(() => {
    if (requestedScope === "national") {
      return true;
    }

    return localFeedTarget !== null;
  }, [requestedScope, localFeedTarget]);

  const requestKey = useMemo(() => {
    if (requestedScope === "national") {
      return "national";
    }

    if (!localFeedTarget) {
      return "local:unavailable";
    }

    if (localFeedTarget.kind === "exact_local") {
      return `local:exact:${localFeedTarget.locationId}:${localFeedTarget.districtId}`;
    }

    if (localFeedTarget.kind === "area_local") {
      return `local:area:${localFeedTarget.locationId}:${localFeedTarget.districtId}`;
    }

    return `local:district:${localFeedTarget.districtId}`;
  }, [requestedScope, localFeedTarget]);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const invalidateRequests = useCallback(() => {
    requestVersionRef.current += 1;
  }, []);

  const buildRequestInput = useCallback(
    (nextCursor: JobsCursor | null): FeedRequestInput => ({
      requestedScope,
      cursor: nextCursor,
      locationId:
        localFeedTarget?.kind === "exact_local" ||
        localFeedTarget?.kind === "area_local"
          ? localFeedTarget.locationId
          : null,
      districtId: localFeedTarget?.districtId ?? null,
    }),
    [requestedScope, localFeedTarget],
  );

  const clearFeedState = useCallback(
    (options?: { preservePremium?: boolean; preserveVisibleJobs?: boolean }) => {
      if (!options?.preserveVisibleJobs) {
        setJobs([]);
        setCursor(null);
        setHasMore(false);
        setNewJobsCount(0);
      }

      setEffectiveScope(requestedScope === "national" ? "national" : "local");
      setResolutionLevel(localFeedTarget?.resolutionLevel ?? null);
      setDisplayLocationLabel(localFeedTarget?.displayLabel ?? null);
      setCoverageNote(null);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);

      if (!options?.preservePremium && shouldClearPremiumForScope(requestedScope)) {
        setPremium(null);
      }
    },
    [requestedScope, localFeedTarget],
  );

  const applyInitialPage = useCallback(
    (page: FeedPageResult) => {
      setJobs(page.jobs);
      setCursor(page.nextCursor);
      setHasMore(Boolean(page.nextCursor));
      setNewJobsCount(page.new_jobs_count ?? 0);
      setPremium(page.premium ?? null);
      setEffectiveScope(page.effective_scope);
      setResolutionLevel(page.resolution_level);
      setDisplayLocationLabel(
        page.display_location_label ?? localFeedTarget?.displayLabel ?? null,
      );
      setCoverageNote(page.coverage_note);
      setError(null);
    },
    [localFeedTarget],
  );

  const runFirstPageFetch = useCallback(
    async (mode: "initial" | "refresh"): Promise<void> => {
      if (!canFetch) {
        invalidateRequests();

        if (jobsRef.current.length > 0) {
          clearFeedState({ preserveVisibleJobs: true });
        } else {
          clearFeedState();
        }

        return;
      }

      const requestVersion = ++requestVersionRef.current;
      const hasExistingJobs = jobsRef.current.length > 0;

      if (mode === "initial") {
        if (hasExistingJobs) {
          setRefreshing(true);
          setLoading(false);
        } else {
          setLoading(true);
          setRefreshing(false);
        }
      } else {
        setRefreshing(true);
        setLoading(false);
      }

      setLoadingMore(false);
      setError(null);

      try {
        const result = (await fetchFeedPage(
          buildRequestInput(null),
        )) as FeedServiceResult;

        if (requestVersion !== requestVersionRef.current) return;

        if (!result.ok) {
          if (shouldClearPremiumForScope(requestedScope)) {
            setPremium(null);
          }

          setError(classifyFeedError(result.error));
          return;
        }

        applyInitialPage(normalizeFeedPage(result.data, requestedScope));
      } finally {
        if (requestVersion === requestVersionRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      canFetch,
      requestedScope,
      buildRequestInput,
      applyInitialPage,
      invalidateRequests,
      clearFeedState,
    ],
  );

  const refresh = useCallback(async () => {
    if (loading || refreshing || loadingMore) return;
    await runFirstPageFetch("refresh");
  }, [loading, refreshing, loadingMore, runFirstPageFetch]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || loading || refreshing || !canFetch) {
      return;
    }

    const requestVersion = requestVersionRef.current;
    const currentCursor = cursor;

    setLoadingMore(true);
    setError(null);

    try {
      const result = (await fetchFeedPage(
        buildRequestInput(currentCursor),
      )) as FeedServiceResult;

      if (requestVersion !== requestVersionRef.current) return;

      if (!result.ok) {
        setError(classifyFeedError(result.error));
        return;
      }

      const page = normalizeFeedPage(result.data, requestedScope);

      setJobs((prev) => {
        const seen = new Set(prev.map((job) => job.id));
        const next = page.jobs.filter((job) => !seen.has(job.id));
        return [...prev, ...next];
      });

      setCursor(page.nextCursor);
      setHasMore(Boolean(page.nextCursor));
      setPremium(page.premium ?? null);
      setNewJobsCount(page.new_jobs_count ?? 0);
      setEffectiveScope(page.effective_scope);
      setResolutionLevel(page.resolution_level);
      setDisplayLocationLabel(
        page.display_location_label ?? localFeedTarget?.displayLabel ?? null,
      );
      setCoverageNote(page.coverage_note);
      setError(null);
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoadingMore(false);
      }
    }
  }, [
    cursor,
    loadingMore,
    loading,
    refreshing,
    canFetch,
    requestedScope,
    buildRequestInput,
    localFeedTarget,
  ]);

  useEffect(() => {
    if (requestKey === lastBootKeyRef.current) {
      return;
    }

    lastBootKeyRef.current = requestKey;
    void runFirstPageFetch("initial");
  }, [requestKey, runFirstPageFetch]);

  return {
    jobs,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
    premium,
    new_jobs_count: newJobsCount,
    error,
    canFetch,
    effectiveScope,
    resolutionLevel,
    displayLocationLabel,
    coverageNote,
  };
}