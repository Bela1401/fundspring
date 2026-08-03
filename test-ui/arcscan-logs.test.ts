import { describe, expect, it } from "vitest";
import { addressTopic, normalizeArcscanLog } from "../lib/arcscan-logs";

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
});
