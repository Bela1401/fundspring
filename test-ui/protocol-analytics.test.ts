import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import type { CampaignSummary } from "../lib/campaigns";
import {
  buildProtocolAnalytics,
  formatBasisPoints,
} from "../lib/protocol-analytics";

const creatorA = "0x1111111111111111111111111111111111111111" as Address;
const creatorB = "0x2222222222222222222222222222222222222222" as Address;
const beneficiaryA = "0x3333333333333333333333333333333333333333" as Address;
const beneficiaryB = "0x4444444444444444444444444444444444444444" as Address;

function campaign(
  addressDigit: string,
  overrides: Partial<CampaignSummary> = {},
): CampaignSummary {
  return {
    address: `0x${addressDigit.repeat(40)}` as Address,
    title: `Campaign ${addressDigit}`,
    metadataURI: "https://example.com/metadata.json",
    metadata: null,
    creator: creatorA,
    beneficiary: beneficiaryA,
    fundingGoal: 100_000_000n,
    totalRaised: 25_000_000n,
    amountClaimed: 0n,
    deadline: 2_000n,
    status: 0,
    progressBps: 2_500n,
    ...overrides,
  };
}

describe("buildProtocolAnalytics", () => {
  it("returns honest empty-state ratios when there is no denominator", () => {
    const snapshot = buildProtocolAnalytics([], 1_000n);

    expect(snapshot).toMatchObject({
      campaignCount: 0,
      liveCampaigns: 0,
      needsFinalization: 0,
      finalizedOutcomeCount: 0,
      uniqueCreators: 0,
      uniqueBeneficiaries: 0,
      fundingCompletionBps: null,
      finalizedSuccessBps: null,
    });
  });

  it("splits live and overdue active campaigns and aggregates onchain values", () => {
    const snapshot = buildProtocolAnalytics([
      campaign("a", { deadline: 1_001n, totalRaised: 50_000_000n }),
      campaign("b", {
        deadline: 1_000n,
        totalRaised: 75_000_000n,
        creator: creatorB,
        beneficiary: beneficiaryB,
      }),
      campaign("c", {
        status: 1,
        totalRaised: 100_000_000n,
        creator: creatorA.toUpperCase() as Address,
      }),
      campaign("d", { status: 2, totalRaised: 10_000_000n }),
      campaign("e", { status: 3, totalRaised: 0n }),
    ], 1_000n);

    expect(snapshot).toMatchObject({
      campaignCount: 5,
      liveCampaigns: 1,
      needsFinalization: 1,
      successfulCampaigns: 1,
      failedCampaigns: 1,
      cancelledCampaigns: 1,
      totalRaised: 235_000_000n,
      totalTarget: 500_000_000n,
      uniqueCreators: 2,
      uniqueBeneficiaries: 2,
      fundingCompletionBps: 4_700n,
      finalizedSuccessBps: 5_000n,
      finalizedOutcomeCount: 2,
    });
  });

  it("excludes cancellations and unresolved campaigns from success ratio", () => {
    const snapshot = buildProtocolAnalytics([
      campaign("a", { status: 1 }),
      campaign("b", { status: 1 }),
      campaign("c", { status: 2 }),
      campaign("d", { status: 3 }),
      campaign("e", { status: 0 }),
    ], 1_000n);

    expect(snapshot.finalizedOutcomeCount).toBe(3);
    expect(snapshot.finalizedSuccessBps).toBe(6_666n);
  });

  it("preserves overfunding and ranks a copy without mutating input", () => {
    const campaigns = [
      campaign("a", { totalRaised: 100_000_000n, progressBps: 10_000n }),
      campaign("b", {
        totalRaised: 250_000_000n,
        fundingGoal: 100_000_000n,
        progressBps: 10_000n,
      }),
    ];

    const snapshot = buildProtocolAnalytics(campaigns, 1_000n);

    expect(snapshot.fundingCompletionBps).toBe(17_500n);
    expect(snapshot.topCampaigns.map(({ address }) => address)).toEqual([
      campaigns[1]?.address,
      campaigns[0]?.address,
    ]);
    expect(campaigns[0]?.address).toBe(`0x${"a".repeat(40)}`);
  });
});

describe("formatBasisPoints", () => {
  it("formats unavailable, fractional, and overfunded ratios", () => {
    expect(formatBasisPoints(null)).toBe("Not available");
    expect(formatBasisPoints(6_666n)).toBe("66.66%");
    expect(formatBasisPoints(10_000n)).toBe("100%");
    expect(formatBasisPoints(17_500n)).toBe("175%");
  });
});
