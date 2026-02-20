// src/services/profile.service.ts

import { supabase } from "../core/supabase";
import type { Profile } from "../types/profile";

/* =====================================================
   GET MY PROFILE (STRICT + AUTHORITATIVE)
===================================================== */

export async function getMyProfile(): Promise<Profile> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    throw new Error("NOT_AUTHENTICATED");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, phone_number, resolved_location_id, role, is_suspended"
    )
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  if (data.is_suspended) {
    throw new Error("ACCOUNT_SUSPENDED");
  }

  return data as Profile;
}
