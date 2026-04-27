import { supabase } from "../core/supabase";
import {
  resolvePostLocation,
  LocationResolveError,
} from "../location/location.service";

export type CreateJobInput = {
  title: string;
  description: string;
  contactMethod: string;
  contactPhone?: string | null;
  payType?: string | null;
  expiresAt: string;
};

export type JobStatus =
  | "draft"
  | "pending_payment"
  | "active"
  | "expired"
  | "closed"
  | "flagged"
  | "deleted";

export type JobRecord = {
  id: string;
  employer_id: string;
  location_id: string | null;
  district_id: string | null;
  title: string;
  description: string;
  contact_phone: string | null;
  contact_method: string | null;
  pay_type: string | null;
  status: JobStatus;
  expires_at: string | null;

  posting_resolution_level: "exact_local" | "area_local" | "district_only" | null;
  posting_display_label: string | null;
  posting_latitude: number | null;
  posting_longitude: number | null;
  posting_accuracy_meters: number | null;
  posted_from_device_at: string | null;

  posting_resolution_confidence: number | null;
  approximate_area_radius_meters: number | null;
  map_visibility_mode:
    | "exact_pin"
    | "offset_pin"
    | "area_circle"
    | "district_anchor"
    | "hidden"
    | null;
  geo_status:
    | "validated"
    | "backfilled_legacy"
    | "weak_accuracy"
    | "stale"
    | "outside_supported_country"
    | "rejected"
    | null;

  created_at?: string;
};

export type JobMutationErrorCode =
  | "AUTH_REQUIRED"
  | "PROFILE_NOT_FOUND"
  | "ACCOUNT_SUSPENDED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "JOB_NOT_IN_DRAFT"
  | "JOB_PUBLISH_FAILED"
  | "OUTSIDE_SUPPORTED_COUNTRY"
  | "POSTING_LOCATION_NOT_PRECISE_ENOUGH"
  | "LOCATION_PERMISSION_DENIED"
  | "LOCATION_SERVICES_DISABLED"
  | "LOCATION_UNAVAILABLE"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

export type JobMutationResult =
  | {
      ok: true;
      job: JobRecord;
    }
  | {
      ok: false;
      code: JobMutationErrorCode;
      message: string;
      fieldErrors?: Record<string, string>;
    };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isJobStatus(value: unknown): value is JobStatus {
  return (
    value === "draft" ||
    value === "pending_payment" ||
    value === "active" ||
    value === "expired" ||
    value === "closed" ||
    value === "flagged" ||
    value === "deleted"
  );
}

function isPostingResolutionLevel(
  value: unknown,
): value is "exact_local" | "area_local" | "district_only" {
  return (
    value === "exact_local" ||
    value === "area_local" ||
    value === "district_only"
  );
}

function isMapVisibilityMode(
  value: unknown,
): value is
  | "exact_pin"
  | "offset_pin"
  | "area_circle"
  | "district_anchor"
  | "hidden" {
  return (
    value === "exact_pin" ||
    value === "offset_pin" ||
    value === "area_circle" ||
    value === "district_anchor" ||
    value === "hidden"
  );
}

function isGeoStatus(
  value: unknown,
): value is
  | "validated"
  | "backfilled_legacy"
  | "weak_accuracy"
  | "stale"
  | "outside_supported_country"
  | "rejected" {
  return (
    value === "validated" ||
    value === "backfilled_legacy" ||
    value === "weak_accuracy" ||
    value === "stale" ||
    value === "outside_supported_country" ||
    value === "rejected"
  );
}

function normalizeJobRecord(data: unknown): JobRecord | null {
  if (!data || typeof data !== "object") return null;

  const row = data as Record<string, unknown>;

  if (
    typeof row.id !== "string" ||
    typeof row.employer_id !== "string" ||
    typeof row.title !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    employer_id: row.employer_id,
    location_id: typeof row.location_id === "string" ? row.location_id : null,
    district_id: typeof row.district_id === "string" ? row.district_id : null,
    title: row.title,
    description: typeof row.description === "string" ? row.description : "",
    contact_phone:
      typeof row.contact_phone === "string" ? row.contact_phone : null,
    contact_method:
      typeof row.contact_method === "string" ? row.contact_method : null,
    pay_type: typeof row.pay_type === "string" ? row.pay_type : null,
    status: isJobStatus(row.status) ? row.status : "draft",
    expires_at: typeof row.expires_at === "string" ? row.expires_at : null,

    posting_resolution_level: isPostingResolutionLevel(row.posting_resolution_level)
      ? row.posting_resolution_level
      : null,
    posting_display_label:
      typeof row.posting_display_label === "string"
        ? row.posting_display_label
        : null,
    posting_latitude: isFiniteNumber(row.posting_latitude)
      ? row.posting_latitude
      : null,
    posting_longitude: isFiniteNumber(row.posting_longitude)
      ? row.posting_longitude
      : null,
    posting_accuracy_meters: isFiniteNumber(row.posting_accuracy_meters)
      ? row.posting_accuracy_meters
      : null,
    posted_from_device_at:
      typeof row.posted_from_device_at === "string"
        ? row.posted_from_device_at
        : null,

    posting_resolution_confidence: isFiniteNumber(
      row.posting_resolution_confidence,
    )
      ? row.posting_resolution_confidence
      : null,
    approximate_area_radius_meters: isFiniteNumber(
      row.approximate_area_radius_meters,
    )
      ? row.approximate_area_radius_meters
      : null,
    map_visibility_mode: isMapVisibilityMode(row.map_visibility_mode)
      ? row.map_visibility_mode
      : null,
    geo_status: isGeoStatus(row.geo_status) ? row.geo_status : null,

    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

function mapRpcError(error: unknown, fallbackMessage: string): JobMutationResult {
  const rawMessage =
    typeof (error as { message?: unknown })?.message === "string"
      ? (error as { message: string }).message
      : fallbackMessage;

  const rawCode =
    typeof (error as { code?: unknown })?.code === "string"
      ? (error as { code: string }).code
      : "UNKNOWN";

  console.log("JOB_RPC_ERROR", {
    message: rawMessage,
    code: rawCode,
    details: (error as { details?: unknown })?.details ?? null,
    hint: (error as { hint?: unknown })?.hint ?? null,
  });

  if (rawMessage.includes("AUTH_REQUIRED")) {
    return {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "Please sign in again.",
    };
  }

  if (rawMessage.includes("PROFILE_NOT_FOUND")) {
    return {
      ok: false,
      code: "PROFILE_NOT_FOUND",
      message: "Your profile could not be loaded.",
    };
  }

  if (rawMessage.includes("ACCOUNT_SUSPENDED")) {
    return {
      ok: false,
      code: "ACCOUNT_SUSPENDED",
      message: "Your account is suspended.",
    };
  }

  if (
    rawMessage.includes("FORBIDDEN:employer_only") ||
    rawMessage.includes("FORBIDDEN")
  ) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only employers can do this action.",
    };
  }

  if (rawMessage.includes("JOB_NOT_FOUND")) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "That job could not be found.",
    };
  }

  if (rawMessage.includes("JOB_NOT_IN_DRAFT")) {
    return {
      ok: false,
      code: "JOB_NOT_IN_DRAFT",
      message: "Only draft jobs can be published.",
    };
  }

  if (rawMessage.includes("JOB_PUBLISH_FAILED")) {
    return {
      ok: false,
      code: "JOB_PUBLISH_FAILED",
      message: "We could not publish this draft right now.",
    };
  }

  if (rawMessage.includes("OUTSIDE_SUPPORTED_COUNTRY")) {
    return {
      ok: false,
      code: "OUTSIDE_SUPPORTED_COUNTRY",
      message: "Jobs can only be posted from inside Uganda.",
    };
  }

  if (rawMessage.includes("POSTING_LOCATION_NOT_PRECISE_ENOUGH")) {
    return {
      ok: false,
      code: "POSTING_LOCATION_NOT_PRECISE_ENOUGH",
      message:
        "We could not confirm your posting area precisely enough yet. Try again where GPS or network signal is stronger.",
    };
  }

  if (rawMessage.includes("VALIDATION_ERROR:title")) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Please enter a job title.",
      fieldErrors: { title: "Job title is required." },
    };
  }

  if (rawMessage.includes("VALIDATION_ERROR:description")) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Please enter a job description.",
      fieldErrors: { description: "Job description is required." },
    };
  }

  if (rawMessage.includes("VALIDATION_ERROR:contact_method")) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Please choose how applicants should contact you.",
      fieldErrors: { contactMethod: "Contact method is required." },
    };
  }

  if (rawMessage.includes("VALIDATION_ERROR:contact_phone")) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Please enter a valid contact phone number.",
      fieldErrors: { contactPhone: "Valid contact phone is required." },
    };
  }

  if (rawMessage.includes("VALIDATION_ERROR:expires_at")) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Please choose a valid expiry date.",
      fieldErrors: { expiresAt: "Expiry date must be in the future." },
    };
  }

  if (rawMessage.includes("VALIDATION_ERROR:district_id")) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "We could not confirm your posting district.",
      fieldErrors: { location: "Posting district could not be confirmed." },
    };
  }

  if (rawMessage.includes("VALIDATION_ERROR:location_id")) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "We could not confirm your posting area.",
      fieldErrors: { location: "Posting area could not be confirmed." },
    };
  }

  if (rawMessage.includes("VALIDATION_ERROR:posting_coordinates")) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "We could not confirm posting coordinates for this draft.",
      fieldErrors: { location: "Posting coordinates are missing." },
    };
  }

  if (rawMessage.includes("VALIDATION_ERROR:posting_point")) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "We could not confirm posting map coordinates for this draft.",
      fieldErrors: { location: "Posting point is missing." },
    };
  }

  if (rawMessage.includes("VALIDATION_ERROR:map_visibility_mode")) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "This draft has an invalid map visibility state.",
      fieldErrors: { location: "Map visibility state is invalid." },
    };
  }

  if (rawMessage.includes("VALIDATION_ERROR:")) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Some job details are invalid.",
    };
  }

  return {
    ok: false,
    code: "UNKNOWN_ERROR",
    message: rawMessage || fallbackMessage,
  };
}

function mapLocationResolveError(error: unknown): JobMutationResult {
  if (error instanceof LocationResolveError) {
    switch (error.code) {
      case "permission_denied":
        return {
          ok: false,
          code: "LOCATION_PERMISSION_DENIED",
          message: "Location permission is off. Turn it on to post a job.",
        };

      case "location_services_disabled":
        return {
          ok: false,
          code: "LOCATION_SERVICES_DISABLED",
          message: "Device location services are off. Turn them on to post a job.",
        };

      case "outside_supported_country":
        return {
          ok: false,
          code: "OUTSIDE_SUPPORTED_COUNTRY",
          message: "Jobs can only be posted from inside Uganda.",
        };

      case "posting_location_not_precise_enough":
        return {
          ok: false,
          code: "POSTING_LOCATION_NOT_PRECISE_ENOUGH",
          message:
            "We could not confirm your posting area precisely enough yet. Try again where GPS or network signal is stronger.",
        };

      case "location_unresolved":
      case "device_location_failed":
      case "resolver_failed":
      default:
        return {
          ok: false,
          code: "LOCATION_UNAVAILABLE",
          message:
            "We could not get a reliable posting location right now. Please try again.",
        };
    }
  }

  console.log("JOB_LOCATION_ERROR", error);

  const raw =
    typeof (error as { message?: unknown })?.message === "string"
      ? (error as { message: string }).message
      : "";

  return {
    ok: false,
    code: "LOCATION_UNAVAILABLE",
    message: raw || "We could not get a reliable posting location right now.",
  };
}

export async function createJobWithDetectedLocation(
  input: CreateJobInput,
): Promise<JobMutationResult> {
  let resolved;

  try {
    resolved = await resolvePostLocation();
  } catch (error) {
    return mapLocationResolveError(error);
  }

  const { data, error } = await supabase.rpc("create_job_with_detected_location", {
    p_title: input.title,
    p_description: input.description,
    p_contact_method: input.contactMethod,
    p_contact_phone: input.contactPhone ?? null,
    p_pay_type: input.payType ?? null,
    p_expires_at: input.expiresAt,
    p_latitude: resolved.lat,
    p_longitude: resolved.lng,
    p_accuracy_meters: resolved.accuracy_meters,
  });

  if (error) {
    return mapRpcError(error, "Could not create job.");
  }

  const job = normalizeJobRecord(data);
  if (!job) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      message: "The created job response was invalid.",
    };
  }

  return {
    ok: true,
    job,
  };
}

export async function publishJob(jobId: string): Promise<JobMutationResult> {
  const normalizedJobId = typeof jobId === "string" ? jobId.trim() : "";

  if (!normalizedJobId) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Job id is required.",
      fieldErrors: { jobId: "Job id is required." },
    };
  }

  const { data, error } = await supabase.rpc("publish_job", {
    p_job_id: normalizedJobId,
  });

  if (error) {
    return mapRpcError(error, "Could not publish job.");
  }

  const job = normalizeJobRecord(data);
  if (!job) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      message: "The published job response was invalid.",
    };
  }

  return {
    ok: true,
    job,
  };
}