import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "daily_job_pulse";

export async function shouldShowPulse(): Promise<boolean> {
  const last = await AsyncStorage.getItem(KEY);
  const today = new Date().toDateString();
  return last !== today;
}

export async function markPulseShown() {
  const today = new Date().toDateString();
  await AsyncStorage.setItem(KEY, today);
}
