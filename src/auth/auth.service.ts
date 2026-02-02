import { supabase } from "../core/supabase";

/* ---------------------------------------------
   TYPES
---------------------------------------------- */
export type OtpError = {
  message: string;
  retryAfter?: number;
};

/* ---------------------------------------------
   REQUEST OTP (SUPABASE PHONE AUTH)
---------------------------------------------- */
export async function requestOtp(
  phoneE164: string
): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneE164,
  });

  if (error) {
    console.error("requestOtp error:", error);
    throw new Error("Unable to send verification code.");
  }
}

/* ---------------------------------------------
   VERIFY OTP (SUPABASE CREATES SESSION)
---------------------------------------------- */
export async function verifyOtp(
  phoneE164: string,
  code: string
): Promise<void> {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token: code.trim(),
    type: "sms",
  });

  if (error) {
    console.error("verifyOtp error:", error);
    throw new Error("Invalid or expired code.");
  }

  if (!data.session) {
    throw new Error("Session was not created.");
  }
}

/* ---------------------------------------------
   SET PIN
---------------------------------------------- */
export async function setPin(pin: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Session expired.");
  }

  const { error } = await supabase.functions.invoke("set_pin", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: { pin },
  });

  if (error) {
    console.error("setPin error:", error);
    throw new Error("Unable to save PIN.");
  }
}

/* ---------------------------------------------
   LOGIN WITH PIN (CUSTOM FLOW)
---------------------------------------------- */
export async function loginWithPin(
  phone: string,
  pin: string
): Promise<void> {
  const { data, error } = await supabase.functions.invoke("verify_pin", {
    body: { phone, pin },
  });

  if (error || !data?.access_token || !data?.refresh_token) {
    throw new Error("Invalid PIN.");
  }

  await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
}

/* ---------------------------------------------
   DELETE ACCOUNT
---------------------------------------------- */
export async function deleteAccount(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase.functions.invoke("delete_account", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    console.error("deleteAccount error:", error);
    throw new Error("Unable to delete account.");
  }

  await supabase.auth.signOut();
}
