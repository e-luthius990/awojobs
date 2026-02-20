export function validateJob(input: {
  title: string;
  description?: string;
  pay_type: string;
  contact_method: string;
  contact_phone?: string;
  expires_at: Date;
}) {
  /* ---------------- TITLE ---------------- */

  const title = input.title?.trim();

  if (!title) {
    throw new Error("Job title is required");
  }

  if (title.length < 4 || title.length > 120) {
    throw new Error("Job title must be between 4 and 120 characters");
  }

  if (/https?:\/\//i.test(title)) {
    throw new Error("Links are not allowed in the job title");
  }

  // Block excessive repeating characters (spam)
  if (/(.)\1{6,}/.test(title)) {
    throw new Error("Job title contains excessive repeated characters");
  }

  // Block excessive ALL CAPS (basic spam signal)
  const upperRatio =
    title.replace(/[^A-Z]/g, "").length / title.length;

  if (upperRatio > 0.8 && title.length > 8) {
    throw new Error("Job title cannot be all caps");
  }

  /* ---------------- DESCRIPTION ---------------- */

  if (input.description) {
    const desc = input.description.trim();

    if (desc.length > 2000) {
      throw new Error("Description cannot exceed 2000 characters");
    }

    if (/https?:\/\//i.test(desc)) {
      throw new Error("Links are not allowed in description");
    }
  }

  /* ---------------- PAY TYPE ---------------- */

  const payType = input.pay_type?.toLowerCase();
  if (!["daily", "weekly", "monthly"].includes(payType)) {
    throw new Error("Invalid pay type");
  }

  /* ---------------- CONTACT METHOD ---------------- */

  const contactMethod = input.contact_method?.toLowerCase();
  if (!["call", "whatsapp", "walk_in", "in_app"].includes(contactMethod)) {
    throw new Error("Invalid contact method");
  }

  /* ---------------- PHONE VALIDATION ---------------- */

  if (contactMethod === "call" || contactMethod === "whatsapp") {
    const phone = input.contact_phone?.trim();

    if (!phone) {
      throw new Error("Contact phone is required");
    }

    const normalized = phone.replace(/\s+/g, "");

    // Uganda mobile or common landline formats
    const isValidUgPhone =
      /^(\+256\d{9}|0\d{9})$/.test(normalized);

    if (!isValidUgPhone) {
      throw new Error("Invalid Uganda phone number format");
    }
  }

  /* ---------------- EXPIRY ---------------- */

  const now = Date.now();
  const expiry = input.expires_at?.getTime();

  if (!expiry || expiry <= now) {
    throw new Error("Expiry must be in the future");
  }

  const maxDays = 30;
  const maxExpiry = now + maxDays * 24 * 60 * 60 * 1000;

  if (expiry > maxExpiry) {
    throw new Error("Expiry cannot exceed 30 days");
  }
}
