"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Address } from "viem";
import {
  isCampaignWatched,
  parseWatchlist,
  toggleWatchedCampaign,
  WATCHLIST_CHANGED_EVENT,
  WATCHLIST_STORAGE_KEY,
} from "@/lib/watchlist";

const EMPTY_SNAPSHOT = "[]";
let browserSnapshot = EMPTY_SNAPSHOT;
let useMemorySnapshot = false;

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getServerSnapshot() {
  return EMPTY_SNAPSHOT;
}

function getBrowserSnapshot() {
  if (useMemorySnapshot) return browserSnapshot;
  const storage = browserStorage();
  if (!storage) {
    useMemorySnapshot = true;
    return browserSnapshot;
  }
  try {
    browserSnapshot = JSON.stringify(
      parseWatchlist(storage.getItem(WATCHLIST_STORAGE_KEY)),
    );
  } catch {
    useMemorySnapshot = true;
  }
  return browserSnapshot;
}

function subscribe(onStoreChange: () => void) {
  const handleLocalChange = () => onStoreChange();
  const handleStorageChange = (event: StorageEvent) => {
    const storage = browserStorage();
    if (!storage || event.storageArea !== storage || event.key !== WATCHLIST_STORAGE_KEY) {
      return;
    }
    useMemorySnapshot = false;
    browserSnapshot = JSON.stringify(parseWatchlist(event.newValue));
    onStoreChange();
  };

  window.addEventListener(WATCHLIST_CHANGED_EVENT, handleLocalChange);
  window.addEventListener("storage", handleStorageChange);
  return () => {
    window.removeEventListener(WATCHLIST_CHANGED_EVENT, handleLocalChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

export function useWatchlist() {
  const serialized = useSyncExternalStore(subscribe, getBrowserSnapshot, getServerSnapshot);
  const addresses = useMemo(() => parseWatchlist(serialized), [serialized]);

  const toggle = useCallback((address: Address) => {
    const next = toggleWatchedCampaign(parseWatchlist(getBrowserSnapshot()), address);
    const serializedNext = JSON.stringify(next);
    const storage = browserStorage();
    try {
      if (!storage) throw new Error("Browser storage unavailable");
      storage.setItem(WATCHLIST_STORAGE_KEY, serializedNext);
      useMemorySnapshot = false;
    } catch {
      useMemorySnapshot = true;
    }
    browserSnapshot = serializedNext;
    window.dispatchEvent(new Event(WATCHLIST_CHANGED_EVENT));
  }, []);

  const isWatched = useCallback(
    (address: Address) => isCampaignWatched(addresses, address),
    [addresses],
  );

  return { addresses, isWatched, toggle };
}
