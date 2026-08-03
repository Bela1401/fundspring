import type { CampaignSummary } from "./campaigns";

const BASIS_POINTS = 10_000n;
const TOP_CAMPAIGN_LIMIT = 5;

export interface ProtocolAnalytics {
  campaignCount: number;
  liveCampaigns: number;
  needsFinalization: number;
  successfulCampaigns: number;
  failedCampaigns: number;
  cancelledCampaigns: number;
  unknownCampaigns: number;
  totalRaised: bigint;
  totalTarget: bigint;
  uniqueCreators: number;
  uniqueBeneficiaries: number;
  fundingCompletionBps: bigint | null;
  finalizedSuccessBps: bigint | null;
  finalizedOutcomeCount: number;
  topCampaigns: CampaignSummary[];
  evaluatedAt: bigint;
}

function ratioBps(numerator: bigint, denominator: bigint): bigint | null {
  if (denominator === 0n) return null;
  return (numerator * BASIS_POINTS) / denominator;
}

/**
 * Produces a deterministic aggregate over the latest campaign state returned by
 * Arc RPC. `nowSeconds` is explicit so deadline classification is testable and
 * does not hide a local-clock dependency.
 */
export function buildProtocolAnalytics(
  campaigns: readonly CampaignSummary[],
  nowSeconds: bigint,
): ProtocolAnalytics {
  let liveCampaigns = 0;
  let needsFinalization = 0;
  let successfulCampaigns = 0;
  let failedCampaigns = 0;
  let cancelledCampaigns = 0;
  let unknownCampaigns = 0;
  let totalRaised = 0n;
  let totalTarget = 0n;
  const creators = new Set<string>();
  const beneficiaries = new Set<string>();

  for (const campaign of campaigns) {
    totalRaised += campaign.totalRaised;
    totalTarget += campaign.fundingGoal;
    creators.add(campaign.creator.toLowerCase());
    beneficiaries.add(campaign.beneficiary.toLowerCase());

    switch (campaign.status) {
      case 0:
        if (campaign.deadline > nowSeconds) liveCampaigns += 1;
        else needsFinalization += 1;
        break;
      case 1:
        successfulCampaigns += 1;
        break;
      case 2:
        failedCampaigns += 1;
        break;
      case 3:
        cancelledCampaigns += 1;
        break;
      default:
        unknownCampaigns += 1;
    }
  }

  const finalizedOutcomeCount = successfulCampaigns + failedCampaigns;
  const topCampaigns = [...campaigns]
    .sort((left, right) => {
      if (left.totalRaised !== right.totalRaised) {
        return left.totalRaised > right.totalRaised ? -1 : 1;
      }
      if (left.progressBps !== right.progressBps) {
        return left.progressBps > right.progressBps ? -1 : 1;
      }
      return left.address.toLowerCase().localeCompare(right.address.toLowerCase());
    })
    .slice(0, TOP_CAMPAIGN_LIMIT);

  return {
    campaignCount: campaigns.length,
    liveCampaigns,
    needsFinalization,
    successfulCampaigns,
    failedCampaigns,
    cancelledCampaigns,
    unknownCampaigns,
    totalRaised,
    totalTarget,
    uniqueCreators: creators.size,
    uniqueBeneficiaries: beneficiaries.size,
    fundingCompletionBps: ratioBps(totalRaised, totalTarget),
    finalizedSuccessBps: ratioBps(
      BigInt(successfulCampaigns),
      BigInt(finalizedOutcomeCount),
    ),
    finalizedOutcomeCount,
    topCampaigns,
    evaluatedAt: nowSeconds,
  };
}

export function formatBasisPoints(value: bigint | null): string {
  if (value === null) return "Not available";
  const whole = value / 100n;
  const fractional = (value % 100n).toString().padStart(2, "0").replace(/0+$/, "");
  return `${whole.toString()}${fractional ? `.${fractional}` : ""}%`;
}
