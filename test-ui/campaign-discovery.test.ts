import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import {
  countCampaignPhases,
  discoverCampaigns,
  getCampaignPhase,
  isCampaignSort,
  isCampaignStatusFilter,
} from "../lib/campaign-discovery";
import type { CampaignSummary } from "../lib/campaigns";

const addresses = {
  solar: "0x0000000000000000000000000000000000000001" as Address,
  library: "0x0000000000000000000000000000000000000002" as Address,
  garden: "0x0000000000000000000000000000000000000003" as Address,
  creator: "0x00000000000000000000000000000000000000c1" as Address,
  beneficiary: "0x00000000000000000000000000000000000000b1" as Address,
};

function campaign(overrides: Partial<CampaignSummary> & Pick<CampaignSummary, "address" | "title">): CampaignSummary {
  return {
    metadataURI: "https://example.org/metadata.json",
    metadata: { description: "A detailed public campaign description for discovery." },
    creator: addresses.creator,
    beneficiary: addresses.beneficiary,
    fundingGoal: 1_000_000n,
    totalRaised: 0n,
    amountClaimed: 0n,
    deadline: 2_000n,
    status: 0,
    progressBps: 0n,
    ...overrides,
  };
}

const campaigns = [
  campaign({ address: addresses.solar, title: "Community solar", deadline: 1_200n, totalRaised: 700n, fundingGoal: 1_000n, progressBps: 7_000n }),
  campaign({ address: addresses.library, title: "Open library", deadline: 900n, status: 1, totalRaised: 2_000n, fundingGoal: 2_000n, progressBps: 10_000n }),
  campaign({ address: addresses.garden, title: "City garden", deadline: 1_100n, totalRaised: 300n, fundingGoal: 4_000n, progressBps: 750n, metadata: { description: "Regenerative urban food and community education space." } }),
];

describe("campaign discovery", () => {
  it("distinguishes live campaigns awaiting permissionless finalization", () => {
    expect(getCampaignPhase(campaigns[0]!, 1_000n)).toBe("live");
    expect(getCampaignPhase(campaign({ address: addresses.solar, title: "Expired", deadline: 1_000n }), 1_000n)).toBe("awaiting-finalization");
    expect(getCampaignPhase(campaigns[1]!, 1_000n)).toBe("successful");
  });

  it("searches title, description, campaign address, creator, and beneficiary", () => {
    expect(discoverCampaigns(campaigns, { query: "community solar", nowSeconds: 1_000n })).toEqual([campaigns[0]]);
    expect(discoverCampaigns(campaigns, { query: "regenerative education", nowSeconds: 1_000n })).toEqual([campaigns[2]]);
    expect(discoverCampaigns(campaigns, { query: addresses.library, nowSeconds: 1_000n })).toEqual([campaigns[1]]);
    expect(discoverCampaigns(campaigns, { query: addresses.creator.toUpperCase(), nowSeconds: 1_000n })).toHaveLength(3);
    expect(discoverCampaigns(campaigns, { query: addresses.beneficiary, nowSeconds: 1_000n })).toHaveLength(3);
  });

  it("filters by derived lifecycle phase", () => {
    expect(discoverCampaigns(campaigns, { status: "live", nowSeconds: 1_000n })).toEqual([campaigns[0], campaigns[2]]);
    expect(discoverCampaigns(campaigns, { status: "successful", nowSeconds: 1_000n })).toEqual([campaigns[1]]);
  });

  it("supports every requested stable sort order", () => {
    expect(discoverCampaigns(campaigns, { sort: "registry-order", nowSeconds: 1_000n })).toEqual(campaigns);
    expect(discoverCampaigns(campaigns, { sort: "ending-soon", nowSeconds: 1_000n })).toEqual([campaigns[2], campaigns[0], campaigns[1]]);
    expect(discoverCampaigns(campaigns, { sort: "most-funded", nowSeconds: 1_000n })).toEqual([campaigns[1], campaigns[0], campaigns[2]]);
    expect(discoverCampaigns(campaigns, { sort: "progress", nowSeconds: 1_000n })).toEqual([campaigns[1], campaigns[0], campaigns[2]]);
    expect(discoverCampaigns(campaigns, { sort: "largest-goal", nowSeconds: 1_000n })).toEqual([campaigns[2], campaigns[1], campaigns[0]]);
  });

  it("counts phases and rejects unsupported URL values", () => {
    expect(countCampaignPhases(campaigns, 1_000n)).toEqual({ live: 2, "awaiting-finalization": 0, successful: 1, failed: 0, cancelled: 0 });
    expect(isCampaignStatusFilter("cancelled")).toBe(true);
    expect(isCampaignStatusFilter("active")).toBe(false);
    expect(isCampaignSort("most-funded")).toBe(true);
    expect(isCampaignSort("newest")).toBe(false);
  });
});
