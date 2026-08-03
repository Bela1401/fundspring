import type { CampaignSummary } from "./campaigns";

export const campaignPhaseOptions = [
  "live",
  "awaiting-finalization",
  "successful",
  "failed",
  "cancelled",
] as const;

export type CampaignPhase = (typeof campaignPhaseOptions)[number];
export type CampaignStatusFilter = "all" | CampaignPhase;

export const campaignPhaseLabels: Record<CampaignPhase, string> = {
  live: "Live",
  "awaiting-finalization": "Awaiting finalization",
  successful: "Successful",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const campaignSortOptions = [
  "registry-order",
  "ending-soon",
  "most-funded",
  "progress",
  "largest-goal",
] as const;

export type CampaignSort = (typeof campaignSortOptions)[number];

export interface CampaignDiscoveryOptions {
  query?: string;
  status?: CampaignStatusFilter;
  sort?: CampaignSort;
  nowSeconds?: bigint;
}

export type CampaignPhaseCounts = Record<CampaignPhase, number>;

export function getCampaignPhase(
  campaign: CampaignSummary,
  nowSeconds: bigint,
): CampaignPhase {
  if (campaign.status === 1) return "successful";
  if (campaign.status === 2) return "failed";
  if (campaign.status === 3) return "cancelled";
  return campaign.deadline > nowSeconds ? "live" : "awaiting-finalization";
}

export function countCampaignPhases(
  campaigns: readonly CampaignSummary[],
  nowSeconds: bigint,
): CampaignPhaseCounts {
  const counts: CampaignPhaseCounts = {
    live: 0,
    "awaiting-finalization": 0,
    successful: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const campaign of campaigns) {
    counts[getCampaignPhase(campaign, nowSeconds)] += 1;
  }
  return counts;
}

export function isCampaignStatusFilter(
  value: string | null,
): value is CampaignStatusFilter {
  return value === "all" || campaignPhaseOptions.some((option) => option === value);
}

export function isCampaignSort(value: string | null): value is CampaignSort {
  return campaignSortOptions.some((option) => option === value);
}

function campaignSearchText(campaign: CampaignSummary): string {
  return [
    campaign.title,
    campaign.metadata?.description,
    campaign.address,
    campaign.creator,
    campaign.beneficiary,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

function descendingBigInt(left: bigint, right: bigint): number {
  if (left === right) return 0;
  return left > right ? -1 : 1;
}

export function discoverCampaigns(
  campaigns: readonly CampaignSummary[],
  options: CampaignDiscoveryOptions = {},
): CampaignSummary[] {
  const nowSeconds = options.nowSeconds ?? BigInt(Math.floor(Date.now() / 1_000));
  const status = options.status ?? "all";
  const sort = options.sort ?? "registry-order";
  const terms = (options.query ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean);

  const matches = campaigns
    .map((campaign, registryIndex) => ({ campaign, registryIndex }))
    .filter(({ campaign }) => {
      if (status !== "all" && getCampaignPhase(campaign, nowSeconds) !== status) {
        return false;
      }
      if (terms.length === 0) return true;
      const searchText = campaignSearchText(campaign);
      return terms.every((term) => searchText.includes(term));
    });

  matches.sort((left, right) => {
    let comparison = 0;
    if (sort === "ending-soon") {
      const leftIsLive = getCampaignPhase(left.campaign, nowSeconds) === "live";
      const rightIsLive = getCampaignPhase(right.campaign, nowSeconds) === "live";
      if (leftIsLive !== rightIsLive) comparison = leftIsLive ? -1 : 1;
      else if (left.campaign.deadline < right.campaign.deadline) comparison = -1;
      else if (left.campaign.deadline > right.campaign.deadline) comparison = 1;
    } else if (sort === "most-funded") {
      comparison = descendingBigInt(left.campaign.totalRaised, right.campaign.totalRaised);
    } else if (sort === "progress") {
      comparison = descendingBigInt(left.campaign.progressBps, right.campaign.progressBps);
    } else if (sort === "largest-goal") {
      comparison = descendingBigInt(left.campaign.fundingGoal, right.campaign.fundingGoal);
    }
    return comparison || left.registryIndex - right.registryIndex;
  });

  return matches.map(({ campaign }) => campaign);
}
