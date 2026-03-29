// src/intent/intent.store.ts

import AsyncStorage from "@react-native-async-storage/async-storage";

/* =====================================================
   STORAGE
===================================================== */

const STORAGE_KEY = "awojobs.pending_intent.v1";

/* =====================================================
   ROUTES
===================================================== */

export type IntentRoute =
  | "Feed"
  | "Premium"
  | "Saved"
  | "Post"
  | "JobDetail";

/* =====================================================
   PREMIUM PLAN
===================================================== */

export type PremiumPlanPurpose =
  | "premium_1_day"
  | "premium_7_days"
  | "premium_30_days";

/* =====================================================
   INTENT TYPES
===================================================== */

type PremiumUpgradeIntent = {
  version: 1;
  kind: "premium_upgrade";
  returnTo: "Premium";
  createdAt: number;
  expiresAt: number;
  payload: {
    source: "guest_upgrade" | "paywall" | "settings";
    plan: {
      purpose: PremiumPlanPurpose;
      label: string;
      amount: number;
    };
  };
};

type PostJobIntent = {
  version: 1;
  kind: "post_job";
  returnTo: "Post";
  createdAt: number;
  expiresAt: number;
  payload: {
    source?: "guest_guard" | "employer_gate";
  };
};

type SavedJobsIntent = {
  version: 1;
  kind: "saved_jobs";
  returnTo: "Saved";
  createdAt: number;
  expiresAt: number;
  payload: {
    source?: "guest_guard";
  };
};

type ApplyJobIntent = {
  version: 1;
  kind: "apply_job";
  returnTo: "JobDetail";
  createdAt: number;
  expiresAt: number;
  payload: {
    jobId: string;
    source?: "guest_guard";
  };
};

export type PendingIntent =
  | PremiumUpgradeIntent
  | PostJobIntent
  | SavedJobsIntent
  | ApplyJobIntent;

/* =====================================================
   TTL
===================================================== */

const TTL_MS = {
  premium_upgrade: 30 * 60 * 1000, // 30 minutes
  post_job: 15 * 60 * 1000, // 15 minutes
  saved_jobs: 15 * 60 * 1000, // 15 minutes
  apply_job: 15 * 60 * 1000, // 15 minutes
} as const;

/* =====================================================
   IN-MEMORY CACHE
===================================================== */

let pendingIntent: PendingIntent | null = null;
let hydrationPromise: Promise<PendingIntent | null> | null = null;

/* =====================================================
   PUBLIC API
===================================================== */

export async function setPendingIntent(
  input:
    | {
        kind: "premium_upgrade";
        returnTo?: "Premium";
        payload: PremiumUpgradeIntent["payload"];
      }
    | {
        kind: "post_job";
        returnTo?: "Post";
        payload?: PostJobIntent["payload"];
      }
    | {
        kind: "saved_jobs";
        returnTo?: "Saved";
        payload?: SavedJobsIntent["payload"];
      }
    | {
        kind: "apply_job";
        returnTo?: "JobDetail";
        payload: ApplyJobIntent["payload"];
      },
): Promise<PendingIntent> {
  const now = Date.now();

  const intent: PendingIntent =
    input.kind === "premium_upgrade"
      ? {
          version: 1,
          kind: "premium_upgrade",
          returnTo: "Premium",
          createdAt: now,
          expiresAt: now + TTL_MS.premium_upgrade,
          payload: input.payload,
        }
      : input.kind === "post_job"
        ? {
            version: 1,
            kind: "post_job",
            returnTo: "Post",
            createdAt: now,
            expiresAt: now + TTL_MS.post_job,
            payload: input.payload ?? {},
          }
        : input.kind === "saved_jobs"
          ? {
              version: 1,
              kind: "saved_jobs",
              returnTo: "Saved",
              createdAt: now,
              expiresAt: now + TTL_MS.saved_jobs,
              payload: input.payload ?? {},
            }
          : {
              version: 1,
              kind: "apply_job",
              returnTo: "JobDetail",
              createdAt: now,
              expiresAt: now + TTL_MS.apply_job,
              payload: input.payload,
            };

  pendingIntent = intent;
  await persistIntent(intent);
  return intent;
}

export async function peekPendingIntent(): Promise<PendingIntent | null> {
  if (pendingIntent) {
    if (isExpired(pendingIntent)) {
      await clearPendingIntent();
      return null;
    }
    return pendingIntent;
  }

  const loaded = await loadPendingIntent();
  if (!loaded) return null;

  if (isExpired(loaded)) {
    await clearPendingIntent();
    return null;
  }

  pendingIntent = loaded;
  return loaded;
}

export async function consumePendingIntent(): Promise<PendingIntent | null> {
  const value = await peekPendingIntent();
  await clearPendingIntent();
  return value;
}

export async function clearPendingIntent(): Promise<void> {
  pendingIntent = null;
  hydrationPromise = null;

  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // swallow storage errors intentionally
  }
}

export async function loadPendingIntent(): Promise<PendingIntent | null> {
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed: unknown = JSON.parse(raw);
      const validated = validatePendingIntent(parsed);

      if (!validated) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return null;
      }

      if (isExpired(validated)) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return null;
      }

      pendingIntent = validated;
      return validated;
    } catch {
      return null;
    } finally {
      hydrationPromise = null;
    }
  })();

  return hydrationPromise;
}

/* =====================================================
   HELPERS
===================================================== */

async function persistIntent(intent: PendingIntent): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // swallow storage errors intentionally
  }
}

function isExpired(intent: PendingIntent): boolean {
  return Date.now() > intent.expiresAt;
}

/* =====================================================
   VALIDATION
===================================================== */

function validatePendingIntent(value: unknown): PendingIntent | null {
  if (!isRecord(value)) return null;
  if (value.version !== 1) return null;
  if (!isFiniteNumber(value.createdAt)) return null;
  if (!isFiniteNumber(value.expiresAt)) return null;
  if (!isString(value.returnTo)) return null;
  if (!isString(value.kind)) return null;
  if (!isRecord(value.payload)) return null;

  switch (value.kind) {
    case "premium_upgrade":
      return validatePremiumUpgradeIntent(value);
    case "post_job":
      return validatePostJobIntent(value);
    case "saved_jobs":
      return validateSavedJobsIntent(value);
    case "apply_job":
      return validateApplyJobIntent(value);
    default:
      return null;
  }
}

function validatePremiumUpgradeIntent(
  value: Record<string, unknown>,
): PremiumUpgradeIntent | null {
  if (value.returnTo !== "Premium") return null;

  const payload = value.payload;
  if (!isRecord(payload)) return null;
  if (
    payload.source !== "guest_upgrade" &&
    payload.source !== "paywall" &&
    payload.source !== "settings"
  ) {
    return null;
  }

  const plan = payload.plan;
  if (!isRecord(plan)) return null;
  if (!isPremiumPlanPurpose(plan.purpose)) return null;
  if (!isNonEmptyString(plan.label)) return null;
  if (!isPositiveInteger(plan.amount)) return null;

  return {
    version: 1,
    kind: "premium_upgrade",
    returnTo: "Premium",
    createdAt: value.createdAt as number,
    expiresAt: value.expiresAt as number,
    payload: {
      source: payload.source,
      plan: {
        purpose: plan.purpose,
        label: plan.label,
        amount: plan.amount,
      },
    },
  };
}

function validatePostJobIntent(
  value: Record<string, unknown>,
): PostJobIntent | null {
  if (value.returnTo !== "Post") return null;

  const payload = value.payload;
  if (!isRecord(payload)) return null;

  const source = payload.source;
  if (
    source !== undefined &&
    source !== "guest_guard" &&
    source !== "employer_gate"
  ) {
    return null;
  }

  return {
    version: 1,
    kind: "post_job",
    returnTo: "Post",
    createdAt: value.createdAt as number,
    expiresAt: value.expiresAt as number,
    payload: {
      ...(source ? { source } : {}),
    },
  };
}

function validateSavedJobsIntent(
  value: Record<string, unknown>,
): SavedJobsIntent | null {
  if (value.returnTo !== "Saved") return null;

  const payload = value.payload;
  if (!isRecord(payload)) return null;

  const source = payload.source;
  if (source !== undefined && source !== "guest_guard") {
    return null;
  }

  return {
    version: 1,
    kind: "saved_jobs",
    returnTo: "Saved",
    createdAt: value.createdAt as number,
    expiresAt: value.expiresAt as number,
    payload: {
      ...(source ? { source } : {}),
    },
  };
}

function validateApplyJobIntent(
  value: Record<string, unknown>,
): ApplyJobIntent | null {
  if (value.returnTo !== "JobDetail") return null;

  const payload = value.payload;
  if (!isRecord(payload)) return null;
  if (!isNonEmptyString(payload.jobId)) return null;

  const source = payload.source;
  if (source !== undefined && source !== "guest_guard") {
    return null;
  }

  return {
    version: 1,
    kind: "apply_job",
    returnTo: "JobDetail",
    createdAt: value.createdAt as number,
    expiresAt: value.expiresAt as number,
    payload: {
      jobId: payload.jobId,
      ...(source ? { source } : {}),
    },
  };
}

/* =====================================================
   TYPE GUARDS
===================================================== */

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isPremiumPlanPurpose(value: unknown): value is PremiumPlanPurpose {
  return (
    value === "premium_1_day" ||
    value === "premium_7_days" ||
    value === "premium_30_days"
  );
}