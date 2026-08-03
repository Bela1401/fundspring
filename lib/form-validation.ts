import { isAddress, maxUint256, parseUnits, zeroAddress } from "viem";

export const MINIMUM_CAMPAIGN_LEAD_MS = 3_600_000;
export const CAMPAIGN_SUBMISSION_SAFETY_MARGIN_MS = 60_000;

export function parsePositiveUsdc(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^(?:\d+(?:\.\d{1,6})?|\.\d{1,6})$/.test(normalized)) {
    return null;
  }
  try {
    const amount = parseUnits(normalized, 6);
    return amount > 0n && amount <= maxUint256 ? amount : null;
  } catch {
    return null;
  }
}

export function isNonZeroAddress(value: string): boolean {
  return isAddress(value) && value.toLowerCase() !== zeroAddress;
}

export function hasMinimumCampaignLeadTime(
  deadline: string,
  now = Date.now(),
  safetyMarginMs = 0,
): boolean {
  if (!deadline) return false;
  const deadlineMs = new Date(deadline).getTime();
  return (
    Number.isFinite(deadlineMs) &&
    deadlineMs >= now + MINIMUM_CAMPAIGN_LEAD_MS + safetyMarginMs
  );
}
