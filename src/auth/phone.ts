export function normalizeUgPhone(input: string): string {
  const s = input.replace(/\s+/g, "").replace(/-/g, "");
  // If already E.164
  if (s.startsWith("+")) return s;

  // Common Uganda formats:
  // 070xxxxxxx -> +25670xxxxxxx
  if (s.startsWith("0") && s.length >= 10) return `+256${s.slice(1)}`;

  // 25670xxxxxxx -> +25670xxxxxxx
  if (s.startsWith("256")) return `+${s}`;

  // Fallback: assume it’s already missing "+"
  return `+${s}`;
}
