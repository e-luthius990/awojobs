import { supabase } from "../core/supabase";

export async function updateProfileLocation(
  location_id: string,
  lat: number,
  lng: number
) {
  await supabase.from("profiles").update({
    resolved_location_id: location_id,
    last_lat: lat,
    last_lng: lng,
    last_located_at: new Date().toISOString(),
  });
}
