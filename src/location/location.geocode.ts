import * as Location from "expo-location";

export type RawGeo = {
  country: string;
  district: string;
  town: string;
  sub_county: string;
};

function normalize(v?: string | null) {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : null;
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<RawGeo> {
  // Ensure permissions are granted (important on Android)
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission not granted");
  }

  const res = await Location.reverseGeocodeAsync({
    latitude: lat,
    longitude: lng,
  });

  const r = res?.[0];

  // Emulator-safe fallbacks
  const country =
    normalize(r?.country) ??
    normalize(r?.isoCountryCode) ??
    "Uganda";

  const district =
    normalize(r?.region) ??
    normalize(r?.subregion) ??
    "Unknown";

  const town =
    normalize(r?.city) ??
    normalize(r?.district) ??
    normalize(r?.name) ??
    "Unknown";

  const sub_county =
    normalize(r?.district) ??
    normalize(r?.street) ??
    "Unknown";

  return {
    country,
    district,
    town,
    sub_county,
  };
}
