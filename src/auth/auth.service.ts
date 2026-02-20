import { supabase } from "../core/supabase";

/* =====================================================
   CONFIG
===================================================== */

const REQUEST_TIMEOUT_MS = 10000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error("Request timed out. Please check your connection."));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/* =====================================================
   PHONE NORMALIZATION (UGANDA STRICT)
===================================================== */

function normalizeUgPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  let normalized: string;

  if (cleaned.startsWith("256")) {
    normalized = "+" + cleaned;
  } else if (cleaned.startsWith("0")) {
    normalized = "+256" + cleaned.slice(1);
  } else if (cleaned.startsWith("7") && cleaned.length === 9) {
    normalized = "+256" + cleaned;
  } else {
    throw new Error("Invalid Uganda phone number.");
  }

  if (!/^\+2567\d{8}$/.test(normalized)) {
    throw new Error("Invalid Uganda phone number.");
  }

  return normalized;
}

/* =====================================================
   PASSWORD VALIDATION
===================================================== */

function validatePassword(password: string) {
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
    throw new Error(
      "Password must be at least 8 characters and include letters and numbers."
    );
  }
}

/* =====================================================
   REGISTER (SAFE + ATOMIC)
===================================================== */

export async function register(params: {
  phone: string;
  password: string;
  full_name: string;
  role: "employer" | "job_seeker";
}) {
  const phone = normalizeUgPhone(params.phone);
  validatePassword(params.password);

  const fullName = params.full_name?.trim();

  if (!fullName || fullName.length < 2) {
    throw new Error("Full name is required.");
  }

  if (!["employer", "job_seeker"].includes(params.role)) {
    throw new Error("Invalid registration role.");
  }

  /* -------------------------------
     1️⃣ Create Auth User
  -------------------------------- */

  const { data: signUpData, error: signUpError } = await withTimeout(
    supabase.auth.signUp({
      phone,
      password: params.password,
    })
  );

  if (signUpError || !signUpData.user) {
    throw new Error("Unable to register. Please try again.");
  }

  const userId = signUpData.user.id;

  /* -------------------------------
     2️⃣ Insert Profile
     (DB is authoritative)
  -------------------------------- */

  const { error: profileError } = await withTimeout(
    supabase.from("profiles").insert({
      id: userId,
      phone_number: phone,
      full_name: fullName,
      role: params.role,
    })
  );

  if (profileError) {
    // ⚠️ Do NOT attempt admin deletion on client
    throw new Error("Account setup failed. Please contact support.");
  }

  /* -------------------------------
     3️⃣ Ensure Session Exists
     (Critical for premium-first)
  -------------------------------- */

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Session initialization failed.");
  }

  return signUpData;
}

/* =====================================================
   LOGIN
===================================================== */

export async function login(params: {
  phone: string;
  password: string;
}) {
  const phone = normalizeUgPhone(params.phone);

  const { data, error } = await withTimeout(
    supabase.auth.signInWithPassword({
      phone,
      password: params.password,
    })
  );

  if (error || !data.user) {
    throw new Error("Invalid phone or password.");
  }

  return data;
}

/* =====================================================
   LOGOUT
===================================================== */

export async function logout() {
  const { error } = await withTimeout(supabase.auth.signOut());

  if (error) {
    throw new Error("Unable to logout.");
  }
}

/* =====================================================
   DELETE ACCOUNT
===================================================== */

export async function deleteAccount() {
  const { error } = await withTimeout(
    supabase.functions.invoke("delete_account", {
      method: "POST",
    })
  );

  if (error) {
    throw new Error("Unable to delete account.");
  }

  await supabase.auth.signOut();
}
