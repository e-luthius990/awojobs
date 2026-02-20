import { supabase } from "../core/supabase";

export async function resolveLocationFromCoords(
  lat: number,
  lng: number
): Promise<{ location_id: string } | null> {
  const { data, error } = await supabase.rpc(
    "resolve_location_from_coords",
    { lat, lng }
  );

  if (error || !data) return null;

  return data;
}
