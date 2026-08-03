import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addressTopic,
  fetchArcscanLogs,
  normalizeArcscanLog,
} from "../lib/arcscan-logs";

afterEach(() => vi.unstubAllGlobals());

function rawLog(blockNumber: bigint, index: number) {
  const hexIndex = `0x${index.toString(16)}`;
  return {
    address: "0x2112eFE5f68F7f9d42596324230197890A29f5ab",
    blockNumber: `0x${blockNumber.toString(16)}`,
    data: "0x",
    logIndex: hexIndex,
    topics: [
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    ],
    transactionHash: `0x${index.toString(16).padStart(64, "0")}`,
    transactionIndex: "0x0",
  };
}

describe("Arcscan log normalization", () => {
  it("encodes an indexed address as a bytes32 topic", () => {
    expect(addressTopic("0x2112eFE5f68F7f9d42596324230197890A29f5ab")).toBe(
      "0x0000000000000000000000002112efe5f68f7f9d42596324230197890a29f5ab",
    );
  });

  it("converts Arcscan hexadecimal fields into a viem log", () => {
    const log = normalizeArcscanLog({
      address: "0x2112eFE5f68F7f9d42596324230197890A29f5ab",
      blockNumber: "0x333dc4d",
      data: "0x",
      logIndex: "0x1a",
      topics: [
        "0x13b6f2136ffc494c97353c1a45f1345b7cf9e18d3631acec99aeea45f338f4c4",
      ],
      transactionHash:
        "0x464f4a2dc3686a0155af1286dc6f56ecab9a3cdec70f721587e1c1e58baac357",
      transactionIndex: "0xa",
    });

    expect(log.blockNumber).toBe(53_730_381n);
    expect(log.logIndex).toBe(26);
    expect(log.transactionIndex).toBe(10);
    expect(log.removed).toBe(false);
  });

  it("splits block ranges when Arcscan reaches its 1,000-log cap", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const fromBlock = BigInt(url.searchParams.get("fromBlock")!);
      const toBlock = BigInt(url.searchParams.get("toBlock")!);
      const result = fromBlock === 1n && toBlock === 10n
        ? Array.from({ length: 1_000 }, (_, index) => rawLog(fromBlock, index))
        : [rawLog(fromBlock, Number(fromBlock))];
      return {
        ok: true,
        json: async () => ({ status: "1", message: "OK", result }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const logs = await fetchArcscanLogs({
      address: "0x2112eFE5f68F7f9d42596324230197890A29f5ab",
      fromBlock: 1n,
      toBlock: 10n,
    });

    expect(logs.map(({ blockNumber }) => blockNumber)).toEqual([1n, 6n]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects a capped single block so callers can use RPC fallback", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: "1",
        message: "OK",
        result: Array.from({ length: 1_000 }, (_, index) => rawLog(7n, index)),
      }),
    } as Response)));

    await expect(fetchArcscanLogs({
      address: "0x2112eFE5f68F7f9d42596324230197890A29f5ab",
      fromBlock: 7n,
      toBlock: 7n,
    })).rejects.toThrow("single block");
  });
});
