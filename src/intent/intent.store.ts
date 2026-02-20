// src/intent/intent.store.ts

/* =====================================================
   INTENT TYPES (ACTION-BASED)
===================================================== */

export type IntentType =
  | "premium"
  | "post_job"
  | "saved_jobs"
  | "apply_job";

export type IntentRoute =
  | "Feed"
  | "Premium"
  | "Saved"
  | "Post"
  | "JobDetail";

/* =====================================================
   PENDING INTENT SHAPE
===================================================== */

export type PendingIntent = {
  intent: IntentType;
  returnTo: IntentRoute;
  meta?: Record<string, any>;
  createdAt: number;
};

const INTENT_TTL_MS = 5 * 60 * 1000; // 5 minutes

let pendingIntent: PendingIntent | null = null;

/* =====================================================
   SET INTENT
   Intentionally overwrites previous intent
===================================================== */

export function setPendingIntent(data: {
  intent: IntentType;
  returnTo: IntentRoute;
  meta?: Record<string, any>;
}) {
  pendingIntent = {
    ...data,
    createdAt: Date.now(),
  };
}

/* =====================================================
   PEEK INTENT (NO CLEAR)
   Auto-expires if stale
===================================================== */

export function peekPendingIntent(): PendingIntent | null {
  if (!pendingIntent) return null;

  if (isExpired(pendingIntent)) {
    pendingIntent = null;
    return null;
  }

  return pendingIntent;
}

/* =====================================================
   CONSUME INTENT (READ + CLEAR)
===================================================== */

export function consumePendingIntent(): PendingIntent | null {
  const value = peekPendingIntent();
  pendingIntent = null;
  return value;
}

/* =====================================================
   CLEAR MANUALLY (OPTIONAL)
===================================================== */

export function clearPendingIntent() {
  pendingIntent = null;
}

/* =====================================================
   INTERNAL
===================================================== */

function isExpired(intent: PendingIntent) {
  return Date.now() - intent.createdAt > INTENT_TTL_MS;
}
