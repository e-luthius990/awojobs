export type JobsCursor = {
  created_at: string;
  id: string;
};

export function encodeCursor(cursor: JobsCursor) {
  return btoa(JSON.stringify(cursor));
}

export function decodeCursor(cursor?: string | null): JobsCursor | null {
  if (!cursor) return null;
  try {
    return JSON.parse(atob(cursor));
  } catch {
    return null;
  }
}
