import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "awojobs:manual_location";

export type ManualLocation = {
  location_id: string;
  district: string | null;
  town: string | null;
  sub_county: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getManualLocation(): Promise<ManualLocation | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ManualLocation>;

    const locationId = normalizeString(parsed?.location_id);
    if (!locationId) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }

    return {
      location_id: locationId,
      district: normalizeString(parsed?.district),
      town: normalizeString(parsed?.town),
      sub_county: normalizeString(parsed?.sub_county),
    };
  } catch {
    await AsyncStorage.removeItem(KEY);
    return null;
  }
}

export async function setManualLocation(location: ManualLocation): Promise<void> {
  const locationId = normalizeString(location.location_id);
  if (!locationId) {
    throw new Error("Invalid manual location: location_id is required.");
  }

  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      location_id: locationId,
      district: normalizeString(location.district),
      town: normalizeString(location.town),
      sub_county: normalizeString(location.sub_county),
    }),
  );
}

export async function clearManualLocation(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}