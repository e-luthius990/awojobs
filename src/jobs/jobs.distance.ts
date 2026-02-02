export type DistanceBucket =
  | "very_close"
  | "nearby"
  | "far"
  | "unknown";

export function getDistanceBucket(
  km?: number
): DistanceBucket {
  if (km == null) return "unknown";
  if (km <= 2) return "very_close";
  if (km <= 6) return "nearby";
  return "far";
}
