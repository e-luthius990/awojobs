import { supabase } from "../core/supabase";

export async function resolveLocationId(
  country: string,
  district: string,
  town: string,
  sub_county: string,
  lat: number,
  lng: number
): Promise<string> {
  // 1) Try exact match
  const found = await supabase
    .from("locations")
    .select("id")
    .eq("country", country)
    .eq("district", district)
    .eq("town", town)
    .eq("sub_county", sub_county)
    .maybeSingle();

  if (found.data?.id) return found.data.id;

  // 2) Insert new
  const inserted = await supabase
    .from("locations")
    .insert({
      country,
      district,
      town,
      sub_county,
      latitude: lat,
      longitude: lng,
    })
    .select("id")
    .single();

  if (inserted.error) throw inserted.error;

  return inserted.data.id as string;
}
