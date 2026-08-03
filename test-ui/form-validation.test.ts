import { describe, expect, it } from "vitest";
import { formatUnits, maxUint256, zeroAddress } from "viem";
import {
  CAMPAIGN_SUBMISSION_SAFETY_MARGIN_MS,
  hasMinimumCampaignLeadTime,
  isNonZeroAddress,
  parsePositiveUsdc,
} from "../lib/form-validation";

describe("parsePositiveUsdc", () => {
  it("accepts positive values with at most six decimals", () => {
    expect(parsePositiveUsdc("1.25")).toBe(1_250_000n);
    expect(parsePositiveUsdc(" 0.000001 ")).toBe(1n);
  });

  it("rejects zero, negatives, scientific notation, and excess precision", () => {
    expect(parsePositiveUsdc("0")).toBeNull();
    expect(parsePositiveUsdc("-1")).toBeNull();
    expect(parsePositiveUsdc("1e3")).toBeNull();
    expect(parsePositiveUsdc("1.0000001")).toBeNull();
  });

  it("accepts uint256 max and rejects values one base unit above it", () => {
    expect(parsePositiveUsdc(formatUnits(maxUint256, 6))).toBe(maxUint256);
    expect(parsePositiveUsdc(formatUnits(maxUint256 + 1n, 6))).toBeNull();
  });
});

describe("isNonZeroAddress", () => {
  it("accepts an ordinary EVM address and rejects the zero address", () => {
    expect(isNonZeroAddress("0xC709918714Fd9b1bF973b250454A1d0a7B9E0c26")).toBe(true);
    expect(isNonZeroAddress(zeroAddress)).toBe(false);
  });
});

describe("hasMinimumCampaignLeadTime", () => {
  it("checks the deadline against the current time, not page-open time", () => {
    const now = new Date("2026-08-03T12:00:00Z").getTime();
    expect(hasMinimumCampaignLeadTime("2026-08-03T13:00:00Z", now)).toBe(true);
    expect(hasMinimumCampaignLeadTime("2026-08-03T12:59:59Z", now)).toBe(false);
  });

  it("can reserve a submission safety margin beyond the contract minimum", () => {
    const now = new Date("2026-08-03T12:00:00Z").getTime();
    expect(
      hasMinimumCampaignLeadTime(
        "2026-08-03T13:01:00Z",
        now,
        CAMPAIGN_SUBMISSION_SAFETY_MARGIN_MS,
      ),
    ).toBe(true);
    expect(
      hasMinimumCampaignLeadTime(
        "2026-08-03T13:00:59Z",
        now,
        CAMPAIGN_SUBMISSION_SAFETY_MARGIN_MS,
      ),
    ).toBe(false);
  });
});
