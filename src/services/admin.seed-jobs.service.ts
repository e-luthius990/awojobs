import { supabase } from "../core/supabase";

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

export type PickerLocation = {
  id: string;
  name: string;
};

export type SeedJobsInput = {
  titles: string[];
  descriptions: string[];
  locationIds: string[];
  jobsPerLocation: number;
  sponsoredRatio: number;
  contactPhone: string | null;
};

export type SeedJobsSuccess = {
  createdCount: number;
  locationsCount: number;
  jobsPerLocation: number;
};

type SupabaseLikeError = {
  message?: string;
  code?: string;
};

type DBLocationRow = {
  id: string;
  district: string | null;
  town: string | null;
  sub_county: string | null;
};

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

  if (message === "PROFILE_NOT_FOUND") {
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
      "You do not have access to seed admin jobs.",
      false,
    );
  }

  if (message.startsWith("VALIDATION_ERROR:")) {
    const field = message.split(":")[1] || "unknown";

    const fieldMessage =
      field === "titles"
        ? "At least one title is required."
        : field === "descriptions"
          ? "At least one description is required."
          : field === "location_ids"
            ? "Select at least one valid location."
            : field === "jobs_per_location"
              ? "Jobs per location must be at least 1."
              : field === "sponsored_ratio"
                ? "Sponsored ratio must be between 0 and 1."
                : field === "contact_method"
                  ? "Contact method is invalid."
                  : "Please correct the highlighted field.";

    return makeError(
      "VALIDATION_ERROR",
      fieldMessage,
      false,
      { [field]: fieldMessage },
    );
  }

  if (
    code === "23514" ||
    code === "23502" ||
    code === "22P02" ||
    code === "PGRST116"
  ) {
    return makeError(
      "VALIDATION_ERROR",
      "Some seed job values are invalid.",
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
    "Failed to seed jobs.",
    true,
  );
}

function buildLocationName(row: DBLocationRow): string {
  return [row.district, row.town, row.sub_county]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(" • ");
}

export async function fetchSeedLocationOptions(
  limit = 2000,
): Promise<AppResult<PickerLocation[]>> {
  const { data, error } = await supabase
    .from("locations")
    .select("id,district,town,sub_county")
    .order("district", { ascending: true })
    .limit(limit);

  if (error) {
    return {
      ok: false,
      error: mapSupabaseError(error),
    };
  }

  const rows = Array.isArray(data) ? (data as DBLocationRow[]) : [];

  const mapped = rows
    .map((row) => {
      const name = buildLocationName(row);
      if (!row.id || !name) return null;
      return {
        id: row.id,
        name,
      };
    })
    .filter((row): row is PickerLocation => row !== null);

  return { ok: true, data: mapped };
}

export async function seedAdminJobs(
  input: SeedJobsInput,
): Promise<AppResult<SeedJobsSuccess>> {
  const { data, error } = await supabase.rpc("admin_seed_jobs", {
    p_titles: input.titles,
    p_descriptions: input.descriptions,
    p_location_ids: input.locationIds,
    p_jobs_per_location: input.jobsPerLocation,
    p_sponsored_ratio: input.sponsoredRatio,
    p_contact_phone: input.contactPhone,
    p_contact_method: "call",
    p_pay_type: "not_specified",
  });

  if (error) {
    return {
      ok: false,
      error: mapSupabaseError(error),
    };
  }

  const raw = (data ?? {}) as Partial<{
    created_count: unknown;
    locations_count: unknown;
    jobs_per_location: unknown;
    success: unknown;
  }>;

  if (
    typeof raw.created_count !== "number" ||
    typeof raw.locations_count !== "number" ||
    typeof raw.jobs_per_location !== "number"
  ) {
    return {
      ok: false,
      error: makeError(
        "UNKNOWN_ERROR",
        "The server returned an invalid seed jobs response.",
        false,
      ),
    };
  }

  return {
    ok: true,
    data: {
      createdCount: raw.created_count,
      locationsCount: raw.locations_count,
      jobsPerLocation: raw.jobs_per_location,
    },
  };
}