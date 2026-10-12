"use client";

import { useSyncExternalStore } from "react";
import { defaultSave, parseSave, SAVE_KEY, type SaveData } from "./progress";

// A tiny external store over localStorage so every screen reads the same save and re-renders on change.

let cache: SaveData | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // e.g. blocked by privacy settings
  }
}

export function readSave(): SaveData {
  if (!cache) {
    try {
      cache = parseSave(storage()?.getItem(SAVE_KEY) ?? null);
    } catch {
      cache = defaultSave();
    }
  }
  return cache;
}

export function updateSave(fn: (s: SaveData) => SaveData): void {
  cache = fn(readSave());
  try {
    storage()?.setItem(SAVE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable: keep playing with in-memory progress.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SAVE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The save, or null during server rendering and hydration (so nothing flashes "locked"). */
export function useSave(): SaveData | null {
  return useSyncExternalStore(subscribe, readSave, () => null);
}
