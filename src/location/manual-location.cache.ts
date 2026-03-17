import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "awojobs:manual_location";

export type ManualLocation = {
  location_id: string;
  district: string | null;
  town: string | null;
  sub_county: string | null;
};

export async function getManualLocation(): Promise<ManualLocation | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ManualLocation>;

    if (!parsed?.location_id || typeof parsed.location_id !== "string") {
      return null;
    }

    return {
      location_id: parsed.location_id,
      district:
        typeof parsed.district === "string" ? parsed.district : null,
      town: typeof parsed.town === "string" ? parsed.town : null,
      sub_county:
        typeof parsed.sub_county === "string" ? parsed.sub_county : null,
    };
  } catch {
    return null;
  }
}

export async function setManualLocation(location: ManualLocation) {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      location_id: location.location_id,
      district: location.district ?? null,
      town: location.town ?? null,
      sub_county: location.sub_county ?? null,
    })
  );
}

export async function clearManualLocation() {
  await AsyncStorage.removeItem(KEY);
}