import { supabase } from "../core/supabase";

export type Profile = {
  id: string;
  phone_number: string;
  resolved_location_id: string | null;
};

export async function getMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, phone_number, resolved_location_id")
    .single();

  if (error) return null;
  return data as Profile;
}
