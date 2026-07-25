import { encodeAbiParameters, keccak256, type Address, type Hex } from "viem";

export interface ContributionMemo {
  memoId: Hex;
  memoData: Hex;
}

export function buildContributionMemo(
  campaign: Address,
  contributor: Address,
  reference: string,
): ContributionMemo {
  const normalizedReference = reference.trim();
  if (!normalizedReference || normalizedReference.length > 48) {
    throw new Error("Contribution reference must contain 1–48 characters.");
  }
  const memoId = keccak256(
    encodeAbiParameters(
      [
        { name: "campaignAddress", type: "address" },
        { name: "contributorAddress", type: "address" },
        { name: "contributionReference", type: "string" },
      ],
      [campaign, contributor, normalizedReference],
    ),
  );
  const memoData = encodeAbiParameters(
    [
      { name: "application", type: "string" },
      { name: "action", type: "string" },
      { name: "campaign", type: "address" },
      { name: "reference", type: "string" },
    ],
    ["FUNSPRING", "CONTRIBUTION", campaign, normalizedReference],
  );
  return { memoId, memoData };
}
