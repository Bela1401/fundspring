import { parseAbiItem, type Address, type PublicClient } from "viem";
import { deploymentBlock } from "./arc";
import { campaignAbi, factoryAbi } from "./contracts";
import { fetchCampaignMetadata, type CampaignMetadata } from "./metadata";

const campaignCreatedEvent = parseAbiItem(
  "event CampaignCreated(address indexed campaign,address indexed creator,address indexed beneficiary,uint256 fundingGoal,uint64 deadline,string metadataURI)",
);

const waitForRpcWindow = () => new Promise((resolve) => setTimeout(resolve, 1_200));

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
  if (deploymentBlock > 0n) {
    const logs = await client.getLogs({
      address: factory,
      event: campaignCreatedEvent,
      fromBlock: deploymentBlock,
      toBlock: "latest",
    });
    return logs.map((log) => log.args.campaign!);
  }

  const count = await client.readContract({
    address: factory,
    abi: factoryAbi,
    functionName: "campaignCount",
  });
  if (count === 0n) return [];

  const result = await client.multicall({
    allowFailure: false,
    contracts: Array.from({ length: Number(count) }, (_, index) => ({
      address: factory,
      abi: factoryAbi,
      functionName: "campaignAt" as const,
      args: [BigInt(index)] as const,
    })),
  });
  return result as Address[];
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
    await waitForRpcWindow();
    campaigns.push(await loadCampaign(client, address));
  }
  return campaigns;
}
