import { describe, expect, it } from "vitest";
import {
  isCampaignWatched,
  normalizeWatchlist,
  parseWatchlist,
  readWatchlist,
  toggleWatchedCampaign,
  WATCHLIST_STORAGE_KEY,
  writeWatchlist,
} from "../lib/watchlist";

const first = "0x1111111111111111111111111111111111111111";
const second = "0x2222222222222222222222222222222222222222";

describe("watchlist helpers", () => {
  it("normalizes valid addresses and removes case-insensitive duplicates", () => {
    expect(normalizeWatchlist([first, first.toUpperCase().replace("0X", "0x"), "invalid", 7])).toEqual([
      first,
    ]);
  });

  it("reads malformed or missing stored data as an empty watchlist", () => {
    expect(parseWatchlist("not-json")).toEqual([]);
    expect(parseWatchlist(JSON.stringify({ address: first }))).toEqual([]);
    expect(readWatchlist({ getItem: () => null })).toEqual([]);
    expect(readWatchlist({ getItem: () => { throw new Error("blocked"); } })).toEqual([]);
  });

  it("toggles membership without changing the order of other campaigns", () => {
    const added = toggleWatchedCampaign([first], second);
    expect(added).toEqual([first, second]);
    expect(isCampaignWatched(added, second)).toBe(true);
    expect(toggleWatchedCampaign(added, first)).toEqual([second]);
  });

  it("writes the stable versioned storage record", () => {
    const writes = new Map<string, string>();
    const stored = writeWatchlist(
      { setItem: (key, value) => writes.set(key, value) },
      [first, "invalid", second],
    );
    expect(stored).toEqual([first, second]);
    expect(writes.get(WATCHLIST_STORAGE_KEY)).toBe(JSON.stringify([first, second]));
  });
});
