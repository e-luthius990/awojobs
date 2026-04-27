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

function normalizeText(value: string): string {
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toDistrictOption(value: unknown): DistrictOption | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id)) return null;
  if (!isNonEmptyString(value.district)) return null;

  return {
    id: value.id.trim(),
    district: value.district.trim(),
  };
}

function toTownOption(value: unknown): TownOption | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id)) return null;
  if (!isNonEmptyString(value.town)) return null;

  return {
    id: value.id.trim(),
    town: value.town.trim(),
  };
}

function toSubCountyOption(value: unknown): SubCountyOption | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id)) return null;
  if (!isNonEmptyString(value.sub_county)) return null;

  return {
    id: value.id.trim(),
    sub_county: value.sub_county.trim(),
  };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }

  return result;
}

export async function fetchDistrictOptions(): Promise<DistrictOption[]> {
  const { data, error } = await supabase.rpc("get_districts");

  if (error) {
    throw new Error(error.message || "Failed to load districts");
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return uniqueById(data.map(toDistrictOption).filter(Boolean) as DistrictOption[]);
}

export async function fetchTownOptions(
  district: string,
): Promise<TownOption[]> {
  const normalizedDistrict = normalizeText(district);

  if (!normalizedDistrict) return [];

  const { data, error } = await supabase.rpc("get_towns", {
    p_district: normalizedDistrict,
  });

  if (error) {
    throw new Error(error.message || "Failed to load towns");
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return uniqueById(data.map(toTownOption).filter(Boolean) as TownOption[]);
}

export async function fetchSubCountyOptions(
  district: string,
  town: string,
): Promise<SubCountyOption[]> {
  const normalizedDistrict = normalizeText(district);
  const normalizedTown = normalizeText(town);

  if (!normalizedDistrict || !normalizedTown) return [];

  const { data, error } = await supabase.rpc("get_sub_counties", {
    p_district: normalizedDistrict,
    p_town: normalizedTown,
  });

  if (error) {
    throw new Error(error.message || "Failed to load sub-counties");
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return uniqueById(
    data.map(toSubCountyOption).filter(Boolean) as SubCountyOption[],
  );
}