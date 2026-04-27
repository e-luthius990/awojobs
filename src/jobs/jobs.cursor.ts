export type JobsCursor = {
  is_currently_sponsored: boolean;
  sponsored_until: string | null;
  created_at: string;
  id: string;
};

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isValidIsoDateString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/* ---------------------------------------------
   ENCODE (URL SAFE BASE64)
---------------------------------------------- */
export function encodeCursor(cursor: JobsCursor): string {
  const json = JSON.stringify(cursor);
  return globalThis.btoa(json);
}

/* ---------------------------------------------
   DECODE (FAIL CLOSED)
---------------------------------------------- */
export function decodeCursor(
  cursor?: string | null,
): JobsCursor | null {
  if (!cursor || typeof cursor !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(globalThis.atob(cursor));

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.is_currently_sponsored !== "boolean" ||
      !(
        parsed.sponsored_until === null ||
        isValidIsoDateString(parsed.sponsored_until)
      ) ||
      !isValidIsoDateString(parsed.created_at) ||
      !isValidUuid(parsed.id)
    ) {
      return null;
    }

    if (!parsed.is_currently_sponsored && parsed.sponsored_until !== null) {
      return null;
    }

    return {
      is_currently_sponsored: parsed.is_currently_sponsored,
      sponsored_until: parsed.sponsored_until,
      created_at: parsed.created_at,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}