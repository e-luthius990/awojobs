import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "awojobs:manual_location";

export async function getManualLocation() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setManualLocation(location_id: string) {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({ location_id })
  );
}
