import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "awojobs:location_list:";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type CachePayload<T> = {
  data: T[];
  cachedAt: number;
};

/* =====================================================
   READ (WITH TTL CHECK)
===================================================== */
export async function getCachedList<T>(
  key: string,
): Promise<T[] | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachePayload<T>;

    // ⛔ expired
    if (Date.now() - parsed.cachedAt > TTL_MS) {
      await AsyncStorage.removeItem(PREFIX + key);
      return null;
    }

    return parsed.data;
  } catch {
    // corrupted cache → drop it
    await AsyncStorage.removeItem(PREFIX + key);
    return null;
  }
}

/* =====================================================
   WRITE
===================================================== */
export async function setCachedList<T>(
  key: string,
  data: T[],
) {
  const payload: CachePayload<T> = {
    data,
    cachedAt: Date.now(),
  };

  await AsyncStorage.setItem(
    PREFIX + key,
    JSON.stringify(payload),
  );
}

/* =====================================================
   OPTIONAL: MANUAL CLEAR (DEBUG / LOGOUT)
===================================================== */
export async function clearLocationCache() {
  const keys = await AsyncStorage.getAllKeys();
  const locKeys = keys.filter((k) =>
    k.startsWith(PREFIX),
  );

  if (locKeys.length) {
    await AsyncStorage.multiRemove(locKeys);
  }
}
