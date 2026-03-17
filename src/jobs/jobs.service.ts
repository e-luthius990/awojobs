import { supabase } from "../core/supabase";
import { ENV } from "../env";
import { JobWithCoords } from "./jobs.types";
import { JobsCursor } from "./jobs.cursor";
import { getDeviceHash } from "../security/device";

/* =====================================================
   CONFIG
===================================================== */

const FEED_REQUEST_TIMEOUT_MS = 10000;
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

/* =====================================================
   TYPES
===================================================== */

export type PremiumState = {
  active: boolean;
  scope: "local" | "national";
  requested_scope: "local" | "national";
  can_access_national: boolean;
};

export type JobsPage = {
  jobs: JobWithCoords[];
  nextCursor: JobsCursor | null;
  premium: PremiumState | null;
  new_jobs_count: number;
};

type FeedApiJob = {
  id: string;
  title: string;
  description: string | null;
  pay_type: string | null;
  location_id: string | null;
  contact_method: string | null;
  contact_phone?: string | null;
  created_at: string;
  expires_at?: string | null;
  is_sponsored?: boolean | null;
  sponsored_until?: string | null;
  is_currently_sponsored?: boolean | null;
};

type FeedApiResponse = {
  jobs?: FeedApiJob[];
  nextCursor?: JobsCursor | null;
  premium?: PremiumState | null;
  new_jobs_count?: number;
  error?: string;
};

/* =====================================================
   HELPERS
===================================================== */

function normalizeLimit(limit?: number) {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return PAGE_SIZE_DEFAULT;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), PAGE_SIZE_MAX);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = FEED_REQUEST_TIMEOUT_MS,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error("NETWORK_TIMEOUT"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function classifyFeedError(
  status: number | null,
  rawMessage: string | null,
): Error {
  const normalized = (rawMessage ?? "").toLowerCase();

  if (
    normalized.includes("network_timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network request failed")
  ) {
    return new Error(
      "We could not load jobs right now. Check your internet connection and try again.",
    );
  }

  if (status === 429 || normalized.includes("rate_limit")) {
    return new Error("You’re refreshing too quickly. Please wait a moment.");
  }

  if (normalized.includes("invalid_location_id")) {
    return new Error("Your selected location is invalid. Please choose it again.");
  }

  if (normalized.includes("invalid_uganda_location")) {
    return new Error("Only Uganda locations are supported right now.");
  }

  if (normalized.includes("database_error") || status === 500) {
    return new Error("We could not load jobs right now. Please try again.");
  }

  return new Error("We could not load jobs right now. Please try again.");
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload) return null;

  if (typeof payload === "string") {
    return payload;
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }

  return null;
}

function mapJob(row: FeedApiJob): JobWithCoords {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    pay_type: row.pay_type,
    location_id: row.location_id,
    contact_method: row.contact_method,
    contact_phone: row.contact_phone ?? null,
    created_at: row.created_at,
    expires_at: row.expires_at ?? null,
    is_sponsored: Boolean(row.is_sponsored),
    sponsored_until: row.sponsored_until ?? null,
    is_currently_sponsored: Boolean(row.is_currently_sponsored),
    lat: null,
    lng: null,
  };
}

/* =====================================================
   FEED FETCHER (SPONSORED-FIRST KEYSET SAFE)
===================================================== */

export async function fetchFeedPage(params: {
  locationId: string | null;
  cursor?: JobsCursor | null;
  limit?: number;
  requestedScope?: "local" | "national";
}): Promise<JobsPage> {
  const {
    locationId,
    cursor = null,
    limit = PAGE_SIZE_DEFAULT,
    requestedScope = "local",
  } = params;

  if (requestedScope === "local" && !locationId) {
    throw new Error("location_required_for_local_feed");
  }

  const safeLimit = normalizeLimit(limit);

  const deviceHash = await getDeviceHash();
  if (!deviceHash) {
    throw new Error("device_hash_unavailable");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token ?? null;

  const body = {
    location_id: requestedScope === "local" ? locationId : null,
    device_hash: deviceHash,
    limit: safeLimit,
    requested_scope: requestedScope,
    cursor_is_currently_sponsored:
      cursor?.is_currently_sponsored ?? undefined,
    cursor_sponsored_until: cursor?.sponsored_until ?? undefined,
    cursor_created_at: cursor?.created_at ?? undefined,
    cursor_id: cursor?.id ?? undefined,
  };

  let res: Response;

  try {
    res = await withTimeout(
      fetch(`${ENV.SUPABASE_URL}/functions/v1/feed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      }),
    );
  } catch (err) {
    throw classifyFeedError(null, err instanceof Error ? err.message : String(err));
  }

  let payload: FeedApiResponse | string | null = null;

  try {
    payload = await res.json();
  } catch {
    try {
      payload = await res.text();
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    throw classifyFeedError(res.status, extractErrorMessage(payload));
  }

  const data =
    payload && typeof payload === "object" ? (payload as FeedApiResponse) : {};

  if (data.error) {
    throw classifyFeedError(res.status, data.error);
  }

  const jobs = Array.isArray(data.jobs) ? data.jobs.map(mapJob) : [];
  const serverCursor = data.nextCursor ?? null;
  const last = jobs[jobs.length - 1];

  return {
    jobs,
    nextCursor:
      serverCursor ??
      (last
        ? {
            is_currently_sponsored: Boolean(last.is_currently_sponsored),
            sponsored_until: last.sponsored_until ?? null,
            created_at: last.created_at,
            id: last.id,
          }
        : null),
    premium: data.premium ?? null,
    new_jobs_count:
      typeof data.new_jobs_count === "number" && Number.isFinite(data.new_jobs_count)
        ? data.new_jobs_count
        : 0,
  };
}