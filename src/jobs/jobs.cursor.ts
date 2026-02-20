
export type JobsCursor = {
  created_at: string;
  id: string;
};

/* ---------------------------------------------
   ENCODE (URL SAFE BASE64)
---------------------------------------------- */
export function encodeCursor(cursor: JobsCursor): string {
  const json = JSON.stringify(cursor);

  return globalThis.btoa(
    unescape(encodeURIComponent(json))
  );
}

/* ---------------------------------------------
   DECODE (FAIL CLOSED)
---------------------------------------------- */
export function decodeCursor(cursor?: string | null): JobsCursor | null {
  if (!cursor || typeof cursor !== "string") {
    return null;
  }

  try {
    const json = decodeURIComponent(
      escape(globalThis.atob(cursor))
    );

    const parsed = JSON.parse(json);

    if (
      typeof parsed !== "object" ||
      typeof parsed.created_at !== "string" ||
      typeof parsed.id !== "string"
    ) {
      return null;
    }

    return {
      created_at: parsed.created_at,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

