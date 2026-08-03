import { getAddress, isAddress, type Address } from "viem";

export const WATCHLIST_STORAGE_KEY = "fundspring:campaign-watchlist:v1";
export const WATCHLIST_CHANGED_EVENT = "fundspring:watchlist-changed";

export function normalizeWatchlist(value: unknown): Address[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const addresses: Address[] = [];

  for (const candidate of value) {
    if (typeof candidate !== "string" || !isAddress(candidate, { strict: false })) {
      continue;
    }

    const address = getAddress(candidate.toLowerCase());
    const key = address.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    addresses.push(address);
  }

  return addresses;
}

export function parseWatchlist(serialized: string | null | undefined): Address[] {
  if (!serialized) return [];

  try {
    return normalizeWatchlist(JSON.parse(serialized));
  } catch {
    return [];
  }
}

export function readWatchlist(storage: Pick<Storage, "getItem"> | null | undefined): Address[] {
  if (!storage) return [];

  try {
    return parseWatchlist(storage.getItem(WATCHLIST_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function writeWatchlist(
  storage: Pick<Storage, "setItem"> | null | undefined,
  addresses: readonly string[],
): Address[] {
  const normalized = normalizeWatchlist(addresses);
  if (!storage) return normalized;

  try {
    storage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // The in-memory watchlist remains usable when browser storage is unavailable.
  }
  return normalized;
}

export function isCampaignWatched(addresses: readonly string[], address: string): boolean {
  if (!isAddress(address, { strict: false })) return false;
  const normalized = address.toLowerCase();
  return addresses.some((candidate) => candidate.toLowerCase() === normalized);
}

export function toggleWatchedCampaign(
  addresses: readonly string[],
  address: string,
): Address[] {
  if (!isAddress(address, { strict: false })) return normalizeWatchlist(addresses);

  const normalizedAddress = getAddress(address.toLowerCase());
  const normalized = normalizeWatchlist(addresses);
  if (isCampaignWatched(normalized, normalizedAddress)) {
    return normalized.filter(
      (candidate) => candidate.toLowerCase() !== normalizedAddress.toLowerCase(),
    );
  }
  return [...normalized, normalizedAddress];
}
