/* =====================================================
   ROLE ENUM (match DB enum exactly)
===================================================== */

export type UserRole =
  | "job_seeker"
  | "employer"
  | "moderator"
  | "super_admin";

/* =====================================================
   FULL DATABASE PROFILE SHAPE
   (Matches public.profiles table)
===================================================== */

export interface ProfileDB {
  id: string;

  full_name: string | null;
  phone_number: string | null;
  business_name: string | null;

  role: UserRole | null;

  district: string | null;
  resolved_location_id: string | null;

  last_lat: number | null;
  last_lng: number | null;
  last_geo: unknown | null;

  last_located_at: string | null;
  last_loc_source: string | null;

  last_feed_seen_at: string | null;
  last_daily_pulse_at: string | null;

  expo_push_token: string | null;
  push_opt_in: boolean | null;

  trust_score: number | null;

  is_suspended: boolean | null;

  failed_login_attempts: number | null;
  locked_until: string | null;

  created_at: string | null;
  updated_at: string | null;
}

/* =====================================================
   SAFE UI PROFILE TYPE
   (What frontend actually needs)
===================================================== */

export interface Profile {
  id: string;

  full_name: string | null;
  phone_number: string | null;

  role: UserRole | null;

  resolved_location_id: string | null;

  is_suspended: boolean;
}

/* =====================================================
   PROFILE UPDATE INPUT
===================================================== */

export interface UpdateProfileInput {
  full_name?: string;
  business_name?: string;
  district?: string;
  resolved_location_id?: string;
}