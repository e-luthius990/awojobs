import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "awojobs:manual_location";

export type ManualLocation = {
  location_id: string;
  district: string;
  town: string;
  sub_county: string;
};

export async function saveManualLocation(loc: ManualLocation) {
  await AsyncStorage.setItem(KEY, JSON.stringify(loc));
}

export async function getManualLocation(): Promise<ManualLocation | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ManualLocation;
  } catch {
    return null;
  }
}

export async function clearManualLocation() {
  await AsyncStorage.removeItem(KEY);
}
