import { type Address, type PublicClient } from "viem";
import { campaignAbi, factoryAbi } from "./contracts";
import { fetchCampaignMetadata, type CampaignMetadata } from "./metadata";

const REGISTRY_PAGE_SIZE = 100n;

export interface CampaignSummary {
  address: Address;
  title: string;
  metadataURI: string;
  metadata: CampaignMetadata | null;
  creator: Address;
  beneficiary: Address;
  fundingGoal: bigint;
  totalRaised: bigint;
  amountClaimed: bigint;
  deadline: bigint;
  status: number;
  progressBps: bigint;
}

export async function loadCampaignAddresses(
  client: PublicClient,
  factory: Address,
): Promise<Address[]> {
  const count = await client.readContract({
    address: factory,
    abi: factoryAbi,
    functionName: "campaignCount",
  });
  if (count === 0n) return [];

  const addresses: Address[] = [];
  for (let offset = 0n; offset < count; offset += REGISTRY_PAGE_SIZE) {
    const remaining = count - offset;
    const limit = remaining < REGISTRY_PAGE_SIZE ? remaining : REGISTRY_PAGE_SIZE;
    const page = await client.readContract({
      address: factory,
      abi: factoryAbi,
      functionName: "getCampaigns",
      args: [offset, limit],
    });
    addresses.push(...(page as Address[]));
  }
  return addresses;
}

export async function loadCampaign(
  client: PublicClient,
  address: Address,
): Promise<CampaignSummary> {
  const [
    title,
    metadataURI,
    creator,
    beneficiary,
    fundingGoal,
    totalRaised,
    amountClaimed,
    deadline,
    status,
    progressBps,
  ] = await client.multicall({
    allowFailure: false,
    contracts: [
      { address, abi: campaignAbi, functionName: "title" },
      { address, abi: campaignAbi, functionName: "metadataURI" },
      { address, abi: campaignAbi, functionName: "creator" },
      { address, abi: campaignAbi, functionName: "beneficiary" },
      { address, abi: campaignAbi, functionName: "fundingGoal" },
      { address, abi: campaignAbi, functionName: "totalRaised" },
      { address, abi: campaignAbi, functionName: "amountClaimed" },
      { address, abi: campaignAbi, functionName: "deadline" },
      { address, abi: campaignAbi, functionName: "status" },
      { address, abi: campaignAbi, functionName: "fundingProgressBps" },
    ],
  });

  return {
    address,
    title: title as string,
    metadataURI: metadataURI as string,
    metadata: await fetchCampaignMetadata(metadataURI as string),
    creator: creator as Address,
    beneficiary: beneficiary as Address,
    fundingGoal: fundingGoal as bigint,
    totalRaised: totalRaised as bigint,
    amountClaimed: amountClaimed as bigint,
    deadline: deadline as bigint,
    status: Number(status),
    progressBps: progressBps as bigint,
  };
}

export async function loadCampaigns(
  client: PublicClient,
  factory: Address,
): Promise<CampaignSummary[]> {
  const addresses = await loadCampaignAddresses(client, factory);
  const campaigns: CampaignSummary[] = [];
  for (const address of addresses) {
    campaigns.push(await loadCampaign(client, address));
  }
  return campaigns;
}
