// src/state/saved.store.ts

type Listener = (count: number) => void;

let savedIds: string[] = [];
let listeners: Listener[] = [];

const SAVED_KEY = "saved_job_ids";

import AsyncStorage from "@react-native-async-storage/async-storage";

/* =====================================================
   INIT (CALL ON APP START OR FIRST USE)
===================================================== */

export async function hydrateSaved() {
  const raw = await AsyncStorage.getItem(SAVED_KEY);
  savedIds = raw ? JSON.parse(raw) : [];
  notify();
}

function notify() {
  const count = savedIds.length;
  listeners.forEach((l) => l(count));
}

/* =====================================================
   PUBLIC API
===================================================== */

export function getSavedCount() {
  return savedIds.length;
}

export async function addSaved(id: string) {
  if (!savedIds.includes(id)) {
    savedIds.push(id);
    await AsyncStorage.setItem(
      SAVED_KEY,
      JSON.stringify(savedIds)
    );
    notify();
  }
}

export async function removeSaved(id: string) {
  savedIds = savedIds.filter((x) => x !== id);
  await AsyncStorage.setItem(
    SAVED_KEY,
    JSON.stringify(savedIds)
  );
  notify();
}

export function subscribe(listener: Listener) {
  listeners.push(listener);
  listener(savedIds.length);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
