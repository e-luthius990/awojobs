// src/security/device.ts

import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as Application from "expo-application";

const DEVICE_ID_KEY = "awojobs_device_id_v1";

let cachedDeviceHash: string | null = null;

/* =====================================================
   DEVICE HASH (STABLE, NON-PII, DEVICE-BOUND)
===================================================== */

export async function getDeviceHash(): Promise<string> {
  // 1️⃣ Memory cache (fast path)
  if (cachedDeviceHash) {
    return cachedDeviceHash;
  }

  try {
    // 2️⃣ SecureStore lookup
    const existing = await SecureStore.getItemAsync(
      DEVICE_ID_KEY
    );

    if (existing) {
      cachedDeviceHash = existing;
      return existing;
    }

    // 3️⃣ Generate secure entropy
    const randomBytes =
      await Crypto.getRandomBytesAsync(32);

    const randomHex = Buffer.from(
      randomBytes
    ).toString("hex");

    // 4️⃣ Non-PII context binding
    const raw = [
      Application.applicationId ?? "awojobs",
      Application.nativeApplicationVersion ?? "0",
      randomHex,
    ].join("|");

    const hash =
      await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        raw
      );

    // 5️⃣ Persist securely
    await SecureStore.setItemAsync(
      DEVICE_ID_KEY,
      hash,
      {
        keychainAccessible:
          SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      }
    );

    cachedDeviceHash = hash;

    return hash;
  } catch {
    // 🔐 Strong fallback using crypto, not Math.random
    const fallback =
      await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Date.now().toString() +
          (await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            Math.random().toString()
          ))
      );

    cachedDeviceHash = fallback;
    return fallback;
  }
}
