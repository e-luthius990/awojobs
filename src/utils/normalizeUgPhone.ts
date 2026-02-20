export function normalizeUgPhone(input: string): string | null {
  if (!input) return null;

  // Remove spaces, dashes, parentheses
  const cleaned = input.replace(/[^\d+]/g, "");

  // +2567XXXXXXXX
  if (/^\+2567\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  // 2567XXXXXXXX
  if (/^2567\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // 07XXXXXXXX
  if (/^07\d{8}$/.test(cleaned)) {
    return `+256${cleaned.slice(1)}`;
  }

  return null; // Invalid Uganda number
}
