import { supabase } from "../core/supabase";

export type DistrictOption = {
  id: string;
  district: string;
};

export type TownOption = {
  id: string;
  town: string;
};

export type SubCountyOption = {
  id: string;
  sub_county: string;
};

export async function fetchDistrictOptions(): Promise<DistrictOption[]> {
  const { data, error } = await supabase.rpc("get_districts");
  if (error) throw new Error(error.message || "Failed to load districts");
  return Array.isArray(data) ? (data as DistrictOption[]) : [];
}

export async function fetchTownOptions(
  district: string
): Promise<TownOption[]> {
  if (!district.trim()) return [];

  const { data, error } = await supabase.rpc("get_towns", {
    p_district: district,
  });

  if (error) throw new Error(error.message || "Failed to load towns");
  return Array.isArray(data) ? (data as TownOption[]) : [];
}

export async function fetchSubCountyOptions(
  district: string,
  town: string
): Promise<SubCountyOption[]> {
  if (!district.trim() || !town.trim()) return [];

  const { data, error } = await supabase.rpc("get_sub_counties", {
    p_district: district,
    p_town: town,
  });

  if (error) throw new Error(error.message || "Failed to load sub-counties");
  return Array.isArray(data) ? (data as SubCountyOption[]) : [];
}