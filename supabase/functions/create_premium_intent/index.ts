import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PremiumPurpose = "premium_1_day" | "premium_7_days" | "premium_30_days";

type ErrorBody = {
  code: string;
  message: string;
  retryable: boolean;
  fieldErrors?: Record<string, string>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  retryable: boolean,
  fieldErrors?: Record<string, string>,
) {
  return json(
    {
      code,
      message,
      retryable,
      ...(fieldErrors ? { fieldErrors } : {}),
    } satisfies ErrorBody,
    status,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPremiumPurpose(value: unknown): value is PremiumPurpose {
  return (
    value === "premium_1_day" ||
    value === "premium_7_days" ||
    value === "premium_30_days"
  );
}

function mapRpcErrorToHttp(error: {
  message?: string;
  code?: string;
  details?: string;
}) {
  const message = (error.message ?? "").trim();

  if (message === "AUTH_REQUIRED") {
    return errorResponse(
      401,
      "AUTH_REQUIRED",
      "Please sign in again.",
      false,
    );
  }

  if (message === "PROFILE_NOT_FOUND") {
    return errorResponse(
      404,
      "NOT_FOUND",
      "Your account profile could not be loaded.",
      false,
    );
  }

  if (message === "ACCOUNT_SUSPENDED") {
    return errorResponse(
      403,
      "FORBIDDEN",
      "Your account is suspended.",
      false,
    );
  }

  if (message === "FORBIDDEN_PREMIUM_ROLE") {
    return errorResponse(
      403,
      "FORBIDDEN",
      "Premium is only available for job seekers.",
      false,
    );
  }

  if (message === "VALIDATION_ERROR:purpose") {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Premium plan is invalid.",
      false,
      { purpose: "Premium plan is invalid." },
    );
  }

  return errorResponse(
    500,
    "DATABASE_ERROR",
    "Unable to create premium payment intent right now.",
    true,
  );
}

serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse(
      405,
      "METHOD_NOT_ALLOWED",
      "Only POST is allowed.",
      false,
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(
        401,
        "AUTH_REQUIRED",
        "Please sign in again.",
        false,
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return errorResponse(
        401,
        "AUTH_REQUIRED",
        "Please sign in again.",
        false,
      );
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: authRes, error: authError } = await service.auth.getUser(token);
    const user = authRes?.user;

    if (authError || !user?.id) {
      return errorResponse(
        401,
        "SESSION_EXPIRED",
        "Your session has ended. Please sign in again.",
        false,
      );
    }

    const body = await req.json().catch(() => null);

    if (!isPlainObject(body)) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Request payload is invalid.",
        false,
      );
    }

    const purpose = "purpose" in body ? body.purpose : null;

    if (!isPremiumPurpose(purpose)) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Premium plan is invalid.",
        false,
        { purpose: "Premium plan is invalid." },
      );
    }

    const { data, error } = await service.rpc("create_premium_payment_intent", {
      p_user_id: user.id,
      p_purpose: purpose,
    });

    if (error) {
      console.error("[create_premium_intent RPC]", {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return mapRpcErrorToHttp(error);
    }

    if (!data || typeof data !== "object") {
      return errorResponse(
        500,
        "INVALID_RESPONSE",
        "Premium payment session could not be created.",
        true,
      );
    }

    return json(data, 200);
  } catch (err) {
    console.error("[create_premium_intent]", err);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Server error.",
      true,
    );
  }
});