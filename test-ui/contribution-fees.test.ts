import { describe, expect, it } from "vitest";
import { contributionFeeEstimate } from "../lib/contribution-fees";

describe("contributionFeeEstimate", () => {
  it("adds approval and action fees for two-transaction flows", () => {
    expect(contributionFeeEstimate(50_000n, 150_000n, 20_000_000_000n)).toEqual({
      approval: 1_000_000_000_000_000n,
      action: 3_000_000_000_000_000n,
      total: 4_000_000_000_000_000n,
      transactionCount: 2,
    });
  });

  it("reports one transaction without approval", () => {
    expect(contributionFeeEstimate(0n, 100_000n, 20_000_000_000n).transactionCount).toBe(1);
  });
});
