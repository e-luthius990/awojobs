export type JobsCursor = {
  is_currently_sponsored: boolean;
  sponsored_until: string | null;
  created_at: string;
  id: string;
};

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
  cursor?: string | null
): JobsCursor | null {
  if (!cursor || typeof cursor !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(globalThis.atob(cursor));

    if (
      typeof parsed !== "object" ||
      typeof parsed.is_currently_sponsored !== "boolean" ||
      !(
        parsed.sponsored_until === null ||
        typeof parsed.sponsored_until === "string"
      ) ||
      typeof parsed.created_at !== "string" ||
      typeof parsed.id !== "string"
    ) {
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