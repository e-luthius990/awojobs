import * as Location from "expo-location";

export async function getCoordinates() {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
    mayShowUserSettingsDialog: true,
  });

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    throw new Error("Invalid device coordinates");
  }

  return { lat, lng };
}