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

export type AdminPostJobInput = {
  title: string;
  description: string;
  locationId: string;
  isSponsored: boolean;
  contactPhone: string | null;
};

export type AdminPostJobSuccess = {
  jobId: string;
};

export type PickerLocation = {
  id: string;
  name: string;
};

type SupabaseLikeError = {
  message?: string;
  code?: string;
};

function makeError(
  code: AppErrorCode,
  message: string,
  retryable: boolean,
  fieldErrors?: Record<string, string>,
): AppError {
  return { code, message, retryable, fieldErrors };
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function buildLocationName(input: {
  district: string | null;
  town: string | null;
  sub_county: string | null;
}): string {
  return [input.district, input.town, input.sub_county]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(" • ");
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
      "You do not have access to post admin jobs.",
      false,
    );
  }

  if (message.startsWith("VALIDATION_ERROR:")) {
    const field = message.split(":")[1] || "unknown";

    const fieldMessage =
      field === "title"
        ? "Job title is required."
        : field === "description"
          ? "Job description is required."
          : field === "location_id"
            ? "Location is required."
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
      "Some job details are invalid.",
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
    "Failed to post admin job.",
    true,
  );
}

export async function fetchExactLocationOptions(
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

  if (!Array.isArray(data)) {
    return { ok: true, data: [] };
  }

  const locations = data
    .map((row) => {
      const r = row as Record<string, unknown>;

      const id = asStringOrNull(r.id);
      const district = asStringOrNull(r.district);
      const town = asStringOrNull(r.town);
      const sub_county = asStringOrNull(r.sub_county);

      if (!id) return null;

      const name = buildLocationName({ district, town, sub_county });
      if (!name) return null;

      return { id, name };
    })
    .filter((v): v is PickerLocation => v !== null);

  return { ok: true, data: locations };
}

export async function postAdminJob(
  input: AdminPostJobInput,
): Promise<AppResult<AdminPostJobSuccess>> {
  const payload = {
    p_title: input.title.trim(),
    p_description: input.description.trim(),
    p_location_id: input.locationId,
    p_is_sponsored: input.isSponsored,
    p_contact_phone: input.contactPhone,
  } as const;

  const { data, error } = await supabase.rpc("admin_post_job", payload);

  if (error) {
    return {
      ok: false,
      error: mapSupabaseError(error),
    };
  }

  if (typeof data !== "string" || !data.trim()) {
    return {
      ok: false,
      error: makeError(
        "UNKNOWN_ERROR",
        "The server returned an invalid job response.",
        false,
      ),
    };
  }

  return {
    ok: true,
    data: {
      jobId: data,
    },
  };
}