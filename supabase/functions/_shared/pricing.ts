/* =====================================================
   EMPLOYER + PREMIUM PRICING MAP
===================================================== */

export const PRICE_MAP = {
  /* -------------------------------
     Employer
  -------------------------------- */
  job_post: 2000,
  sponsored_day: 5000,
  sponsored_week: 10000,
  sponsored_month: 25000,

  /* -------------------------------
     Premium Job Seeker
  -------------------------------- */
  premium_1_day: 2000,
  premium_7_days: 5000,
  premium_30_days: 20000,
} as const;

export type PaymentPurpose = keyof typeof PRICE_MAP;

/* =====================================================
   SPONSORSHIP EXPIRY (EMPLOYER)
   - Additive
   - Safe for repeated confirmations
===================================================== */

export function sponsorshipExpiry(
  purpose: PaymentPurpose,
  current?: string | null,
): Date | null {
  if (
    purpose !== "sponsored_day" &&
    purpose !== "sponsored_week" &&
    purpose !== "sponsored_month"
  ) {
    return null;
  }

  const now = new Date();
  const base =
    current && new Date(current) > now
      ? new Date(current)
      : now;

  switch (purpose) {
    case "sponsored_day":
      base.setDate(base.getDate() + 1);
      return base;

    case "sponsored_week":
      base.setDate(base.getDate() + 7);
      return base;

    case "sponsored_month":
      base.setDate(base.getDate() + 30);
      return base;

    default:
      return null;
  }
}

/* =====================================================
   PREMIUM EXPIRY (JOB SEEKER)
   - Additive
   - Extends active premium
   - Safe against race conditions
===================================================== */

export function premiumExpiry(
  purpose: PaymentPurpose,
  current?: string | null,
): Date | null {
  if (
    purpose !== "premium_1_day" &&
    purpose !== "premium_7_days" &&
    purpose !== "premium_30_days"
  ) {
    return null;
  }

  const now = new Date();
  const base =
    current && new Date(current) > now
      ? new Date(current)
      : now;

  switch (purpose) {
    case "premium_1_day":
      base.setDate(base.getDate() + 1);
      return base;

    case "premium_7_days":
      base.setDate(base.getDate() + 7);
      return base;

    case "premium_30_days":
      base.setDate(base.getDate() + 30);
      return base;

    default:
      return null;
  }
}
