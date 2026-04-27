export function validateJob(input: {
  title: string;
  description?: string;
  pay_type: string;
  contact_method: string;
  contact_phone?: string;
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

  if (/(.)\1{6,}/.test(title)) {
    throw new Error("Job title contains excessive repeated characters");
  }

  const upperRatio = title.replace(/[^A-Z]/g, "").length / title.length;

  if (upperRatio > 0.8 && title.length > 8) {
    throw new Error("Job title cannot be mostly all caps");
  }

  /* ---------------- DESCRIPTION ---------------- */

  const desc = input.description?.trim() ?? "";

  if (desc.length > 2000) {
    throw new Error("Description cannot exceed 2000 characters");
  }

  if (/https?:\/\//i.test(desc)) {
    throw new Error("Links are not allowed in description");
  }

  /* ---------------- PAY TYPE ---------------- */

  const payType = input.pay_type?.toLowerCase();

  if (!["daily", "weekly", "monthly", "not_specified"].includes(payType)) {
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

    const digits = phone.replace(/\D/g, "");

    const isValidUgPhone =
      /^256\d{9}$/.test(digits) ||
      /^0\d{9}$/.test(digits) ||
      /^7\d{8}$/.test(digits);

    if (!isValidUgPhone) {
      throw new Error("Invalid Uganda phone number format");
    }
  }
}