export function validateJob(input: {
  title: string;
  pay_type: string;
  contact_method: string;
  contact_phone: string;
  expires_at: Date;
}) {
  if (!input.title.trim()) throw new Error("Job title is required");
  if (!["daily", "weekly", "monthly"].includes(input.pay_type))
    throw new Error("Invalid pay type");
  if (!["call", "whatsapp", "walk_in"].includes(input.contact_method))
    throw new Error("Invalid contact method");
  if (!input.contact_phone.trim())
    throw new Error("Contact phone is required");
  if (input.expires_at.getTime() <= Date.now())
    throw new Error("Expiry must be in the future");
}
