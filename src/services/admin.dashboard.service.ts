import { supabase } from "../core/supabase";

export type AdminDashboardPeriod = "weekly" | "monthly";

export type RevenuePoint = {
  day: string;
  revenue: number;
};

export type AdminSummary = {
  total_users: number;
  active_jobs: number;
  flagged_jobs: number;
  confirmed_revenue_ugx: number;
  pending_payments: number;
  active_premium_users: number;
  today_revenue: number;
  period_revenue: number;
  daily_revenue: RevenuePoint[];
};

export type AdminDashboardData = {
  adminName: string;
  summary: AdminSummary;
};

export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export type AppError = {
  code: AppErrorCode;
  message: string;
  retryable: boolean;
  fieldErrors?: Record<string, string>;
};

export type AppResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  name?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseRevenuePoints(value: unknown): RevenuePoint[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;

      const day = typeof item.day === "string" ? item.day : null;
      const revenue = isNumber(item.revenue) ? item.revenue : null;

      if (!day || revenue === null) return null;

      return { day, revenue };
    })
    .filter((item): item is RevenuePoint => item !== null);
}

function parseAdminSummary(raw: unknown): AdminSummary | null {
  if (!isRecord(raw)) return null;

  const total_users = raw.total_users;
  const active_jobs = raw.active_jobs;
  const flagged_jobs = raw.flagged_jobs;
  const confirmed_revenue_ugx = raw.confirmed_revenue_ugx;
  const pending_payments = raw.pending_payments;
  const active_premium_users = raw.active_premium_users;
  const today_revenue = raw.today_revenue;
  const period_revenue = raw.period_revenue;
  const daily_revenue = parseRevenuePoints(raw.daily_revenue);

  if (
    !isNumber(total_users) ||
    !isNumber(active_jobs) ||
    !isNumber(flagged_jobs) ||
    !isNumber(confirmed_revenue_ugx) ||
    !isNumber(pending_payments) ||
    !isNumber(active_premium_users) ||
    !isNumber(today_revenue) ||
    !isNumber(period_revenue)
  ) {
    return null;
  }

  return {
    total_users,
    active_jobs,
    flagged_jobs,
    confirmed_revenue_ugx,
    pending_payments,
    active_premium_users,
    today_revenue,
    period_revenue,
    daily_revenue,
  };
}

function makeError(
  code: AppErrorCode,
  message: string,
  retryable: boolean,
  fieldErrors?: Record<string, string>,
): AppError {
  return { code, message, retryable, fieldErrors };
}

function mapSupabaseError(error: SupabaseLikeError | null | undefined): AppError {
  const message = (error?.message ?? "").trim();
  const code = (error?.code ?? "").trim();

  if (
    message === "AUTH_REQUIRED" ||
    message === "Invalid Refresh Token: Refresh Token Not Found" ||
    message === "JWT expired" ||
    code === "PGRST301"
  ) {
    return makeError(
      "SESSION_EXPIRED",
      "Your session has ended. Please sign in again.",
      false,
    );
  }

  if (
    message === "PROFILE_NOT_FOUND"
  ) {
    return makeError(
      "NOT_FOUND",
      "Your account profile could not be loaded.",
      false,
    );
  }

  if (
    message === "FORBIDDEN_SUPER_ADMIN_ONLY" ||
    message === "Unauthorized"
  ) {
    return makeError(
      "FORBIDDEN",
      "You do not have access to this admin dashboard.",
      false,
    );
  }

  if (message.startsWith("VALIDATION_ERROR:")) {
    const field = message.split(":")[1] || "unknown";

    return makeError(
      "VALIDATION_ERROR",
      "Some dashboard request values are invalid.",
      false,
      { [field]: "Invalid value." },
    );
  }

  if (
    code === "PGRST116" ||
    code === "22P02" ||
    code === "23502" ||
    code === "23514"
  ) {
    return makeError(
      "VALIDATION_ERROR",
      "Some dashboard request values are invalid.",
      false,
    );
  }

  if (
    code === "PGRST202" ||
    message.includes("Could not find the function") ||
    message.includes("function") && message.includes("does not exist")
  ) {
    return makeError(
      "UNKNOWN_ERROR",
      "The admin dashboard is temporarily misconfigured.",
      false,
    );
  }

  if (
    message.toLowerCase().includes("network") ||
    message.toLowerCase().includes("fetch") ||
    code === "ECONNREFUSED"
  ) {
    return makeError(
      "NETWORK_ERROR",
      "Network issue. Please check your connection and try again.",
      true,
    );
  }

  return makeError(
    "UNKNOWN_ERROR",
    "Could not load the admin dashboard.",
    true,
  );
}

async function getAdminName(): Promise<string> {
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return "Admin";
  }

  const userId = sessionData.session?.user?.id;
  if (!userId) {
    return "Admin";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const fullName =
    profile && typeof profile.full_name === "string"
      ? profile.full_name.trim()
      : "";

  return fullName || "Admin";
}

async function callDashboardSummaryRpc(
  period: AdminDashboardPeriod,
): Promise<{ data: unknown; error: SupabaseLikeError | null }> {
  const preferred = await supabase.rpc("super_admin_dashboard_summary_by_period", {
    p_period: period,
  });

  if (!preferred.error) {
    return preferred;
  }

  const preferredMessage = preferred.error.message ?? "";
  const preferredCode = preferred.error.code ?? "";

  const shouldFallbackToLegacyName =
    preferredCode === "PGRST202" ||
    preferredMessage.includes("Could not find the function") ||
    preferredMessage.includes("does not exist");

  if (!shouldFallbackToLegacyName) {
    return preferred;
  }

  const legacy = await supabase.rpc("super_admin_dashboard_summary", {
    p_period: period,
  });

  return legacy;
}

export async function getAdminDashboardSummary(
  period: AdminDashboardPeriod,
): Promise<AppResult<AdminDashboardData>> {
  const adminNamePromise = getAdminName();
  const summaryResult = await callDashboardSummaryRpc(period);
  const adminName = await adminNamePromise;

  if (summaryResult.error) {
    return {
      ok: false,
      error: mapSupabaseError(summaryResult.error),
    };
  }

  const summary = parseAdminSummary(summaryResult.data);
  if (!summary) {
    return {
      ok: false,
      error: makeError(
        "UNKNOWN_ERROR",
        "The admin dashboard response was invalid.",
        false,
      ),
    };
  }

  return {
    ok: true,
    data: {
      adminName,
      summary,
    },
  };
}