"use client";

import { useQuery } from "@tanstack/react-query";
import {
  decodeAbiParameters,
  parseAbiItem,
  parseEventLogs,
  toEventSelector,
  type Address,
  type Hex,
  type Log,
  type PublicClient,
} from "viem";
import { usePublicClient } from "wagmi";
import { addressTopic, fetchArcscanLogs } from "@/lib/arcscan-logs";
import {
  ARC_CHAIN_ID,
  deploymentBlock,
  explorerTx,
  factoryAddress,
  memoAddress,
  usdcAddress,
} from "@/lib/arc";
import { formatUsdc, shorten } from "@/lib/format";

interface Activity {
  id: string;
  blockNumber: bigint;
  logIndex: number;
  txHash: Hex;
  kind: string;
  title: string;
  detail: string;
  reference?: string;
}

const contributionEvent = parseAbiItem(
  "event ContributionReceived(address indexed contributor,uint256 amount,uint256 contributorTotal,uint256 totalRaised)",
);
const cancelledEvent = parseAbiItem("event CampaignCancelled(address indexed creator)");
const finalizedEvent = parseAbiItem(
  "event CampaignFinalized(uint8 indexed status,uint256 totalRaised,uint256 fundingGoal)",
);
const claimedEvent = parseAbiItem("event FundsClaimed(address indexed beneficiary,uint256 amount)");
const refundEvent = parseAbiItem("event RefundClaimed(address indexed contributor,uint256 amount)");
const transferEvent = parseAbiItem(
  "event Transfer(address indexed from,address indexed to,uint256 value)",
);
const memoEvent = parseAbiItem(
  "event Memo(address indexed sender,address indexed target,bytes32 callDataHash,bytes32 indexed memoId,bytes memo,uint256 memoIndex)",
);
const createdEvent = parseAbiItem(
  "event CampaignCreated(address indexed campaign,address indexed creator,address indexed beneficiary,uint256 fundingGoal,uint64 deadline,string metadataURI)",
);

function activityId(address: Address, txHash: Hex, logIndex: number): string {
  return `${address}-${txHash}-${logIndex}`;
}

async function loadRpcLogs(
  client: PublicClient,
  campaign: Address,
  fromBlock: bigint,
): Promise<Log[]> {
  const configuredFactory = factoryAddress;
  const latest = await client.getBlockNumber();
  const logs: Log[] = [];
  const chunkSize = 9_000n;
  for (let cursor = fromBlock; cursor <= latest; cursor += chunkSize) {
    const toBlock = cursor + chunkSize - 1n > latest ? latest : cursor + chunkSize - 1n;
    const [campaignLogs, transfersIn, transfersOut, memoLogs] = await Promise.all([
      client.getLogs({ address: campaign, fromBlock: cursor, toBlock }),
      client.getLogs({
        address: usdcAddress,
        event: transferEvent,
        args: { to: campaign },
        fromBlock: cursor,
        toBlock,
      }),
      client.getLogs({
        address: usdcAddress,
        event: transferEvent,
        args: { from: campaign },
        fromBlock: cursor,
        toBlock,
      }),
      client.getLogs({
        address: memoAddress,
        event: memoEvent,
        args: { target: campaign },
        fromBlock: cursor,
        toBlock,
      }),
    ]);
    logs.push(...campaignLogs, ...transfersIn, ...transfersOut, ...memoLogs);
    if (configuredFactory) {
      const factoryLogs = await client.getLogs({
        address: configuredFactory,
        event: createdEvent,
        args: { campaign },
        fromBlock: cursor,
        toBlock,
      });
      logs.push(...factoryLogs);
    }
  }
  return logs;
}

async function loadArcscanLogs(campaign: Address, fromBlock: bigint): Promise<Log[]> {
  const campaignAsTopic = addressTopic(campaign);
  const requests = [
    fetchArcscanLogs({ address: campaign, fromBlock }),
    fetchArcscanLogs({
      address: usdcAddress,
      fromBlock,
      topics: { 0: toEventSelector(transferEvent), 2: campaignAsTopic },
    }),
    fetchArcscanLogs({
      address: usdcAddress,
      fromBlock,
      topics: { 0: toEventSelector(transferEvent), 1: campaignAsTopic },
    }),
    fetchArcscanLogs({
      address: memoAddress,
      fromBlock,
      topics: { 0: toEventSelector(memoEvent), 2: campaignAsTopic },
    }),
  ];
  if (factoryAddress) {
    requests.push(
      fetchArcscanLogs({
        address: factoryAddress,
        fromBlock,
        topics: { 0: toEventSelector(createdEvent), 1: campaignAsTopic },
      }),
    );
  }

  const logs = (await Promise.all(requests)).flat();
  if (logs.length === 0) {
    throw new Error("Arcscan has not indexed this campaign yet");
  }
  return logs;
}

async function loadActivity(client: PublicClient, campaign: Address): Promise<Activity[]> {
  const configuredFactory = factoryAddress;
  let fromBlock = deploymentBlock;
  if (fromBlock === 0n) {
    const latest = await client.getBlockNumber();
    fromBlock = latest > 100_000n ? latest - 100_000n : 0n;
  }

  let logs: Log[];
  try {
    logs = await loadArcscanLogs(campaign, fromBlock);
  } catch {
    logs = await loadRpcLogs(client, campaign, fromBlock);
  }

  const campaignLogs = parseEventLogs({
    abi: [contributionEvent, cancelledEvent, finalizedEvent, claimedEvent, refundEvent],
    logs: logs.filter((log) => log.address.toLowerCase() === campaign.toLowerCase()),
    strict: false,
  });
  const contributions = campaignLogs.filter(
    (log) => log.eventName === "ContributionReceived",
  );
  const cancellations = campaignLogs.filter((log) => log.eventName === "CampaignCancelled");
  const finalizations = campaignLogs.filter((log) => log.eventName === "CampaignFinalized");
  const claims = campaignLogs.filter((log) => log.eventName === "FundsClaimed");
  const refunds = campaignLogs.filter((log) => log.eventName === "RefundClaimed");

  const transfers = parseEventLogs({
    abi: [transferEvent],
    logs: logs.filter((log) => log.address.toLowerCase() === usdcAddress.toLowerCase()),
    strict: false,
  });
  const transfersIn = transfers.filter(
    (log) => log.args.to?.toLowerCase() === campaign.toLowerCase(),
  );
  const transfersOut = transfers.filter(
    (log) => log.args.from?.toLowerCase() === campaign.toLowerCase(),
  );

  const memos = parseEventLogs({
    abi: [memoEvent],
    logs: logs.filter((log) => log.address.toLowerCase() === memoAddress.toLowerCase()),
    strict: false,
  }).filter((log) => log.args.target?.toLowerCase() === campaign.toLowerCase());

  const creations = configuredFactory
    ? parseEventLogs({
        abi: [createdEvent],
        logs: logs.filter(
          (log) => log.address.toLowerCase() === configuredFactory.toLowerCase(),
        ),
        strict: false,
      }).filter((log) => log.args.campaign?.toLowerCase() === campaign.toLowerCase())
    : [];

  const memoByTx = new Map<Hex, string>();
  for (const log of memos) {
    try {
      const [, action, encodedCampaign, reference] = decodeAbiParameters(
        [
          { type: "string" },
          { type: "string" },
          { type: "address" },
          { type: "string" },
        ],
        log.args.memo!,
      );
      if (
        action === "CONTRIBUTION" &&
        encodedCampaign.toLowerCase() === campaign.toLowerCase()
      ) {
        memoByTx.set(log.transactionHash, reference);
      }
    } catch {
      // Unknown memo formats remain visible as raw memo IDs below.
    }
  }

  const activity: Activity[] = [];
  for (const log of creations) {
    activity.push({
      id: activityId(log.address, log.transactionHash, log.logIndex),
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      txHash: log.transactionHash,
      kind: "created",
      title: "Campaign created",
      detail: `Creator ${shorten(log.args.creator!)}`,
    });
  }
  for (const log of contributions) {
    activity.push({
      id: activityId(log.address, log.transactionHash, log.logIndex),
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      txHash: log.transactionHash,
      kind: "contribution",
      title: `${formatUsdc(log.args.amount!)} USDC contributed`,
      detail: `From ${shorten(log.args.contributor!)} · total ${formatUsdc(log.args.totalRaised!)} USDC`,
      reference: memoByTx.get(log.transactionHash),
    });
  }
  for (const log of transfersIn) {
    activity.push({
      id: activityId(log.address, log.transactionHash, log.logIndex),
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      txHash: log.transactionHash,
      kind: "usdc",
      title: "USDC escrow transfer",
      detail: `${formatUsdc(log.args.value!)} USDC from ${shorten(log.args.from!)}`,
    });
  }
  for (const log of transfersOut) {
    activity.push({
      id: activityId(log.address, log.transactionHash, log.logIndex),
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      txHash: log.transactionHash,
      kind: "usdc",
      title: "USDC released",
      detail: `${formatUsdc(log.args.value!)} USDC to ${shorten(log.args.to!)}`,
    });
  }
  for (const log of memos) {
    activity.push({
      id: activityId(log.address, log.transactionHash, log.logIndex),
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      txHash: log.transactionHash,
      kind: "memo",
      title: "Arc transaction memo",
      detail: `Memo ${log.args.memoId!.slice(0, 10)}… · index ${log.args.memoIndex!}`,
      reference: memoByTx.get(log.transactionHash),
    });
  }
  for (const log of finalizations) {
    activity.push({
      id: activityId(log.address, log.transactionHash, log.logIndex),
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      txHash: log.transactionHash,
      kind: "finalized",
      title: log.args.status === 1 ? "Campaign finalized successfully" : "Campaign finalized below goal",
      detail: `${formatUsdc(log.args.totalRaised!)} of ${formatUsdc(log.args.fundingGoal!)} USDC`,
    });
  }
  for (const log of cancellations) {
    activity.push({
      id: activityId(log.address, log.transactionHash, log.logIndex),
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      txHash: log.transactionHash,
      kind: "cancelled",
      title: "Campaign cancelled",
      detail: `By creator ${shorten(log.args.creator!)}`,
    });
  }
  for (const log of claims) {
    activity.push({
      id: activityId(log.address, log.transactionHash, log.logIndex),
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      txHash: log.transactionHash,
      kind: "claim",
      title: "Beneficiary claimed funds",
      detail: `${formatUsdc(log.args.amount!)} USDC to ${shorten(log.args.beneficiary!)}`,
    });
  }
  for (const log of refunds) {
    activity.push({
      id: activityId(log.address, log.transactionHash, log.logIndex),
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      txHash: log.transactionHash,
      kind: "refund",
      title: "Contributor refund claimed",
      detail: `${formatUsdc(log.args.amount!)} USDC to ${shorten(log.args.contributor!)}`,
    });
  }

  return Array.from(new Map(activity.map((item) => [item.id, item])).values()).sort(
    (a, b) =>
      a.blockNumber === b.blockNumber
        ? b.logIndex - a.logIndex
        : a.blockNumber > b.blockNumber
          ? -1
          : 1,
  );
}

export function ActivityFeed({ campaign }: { campaign: Address }) {
  const client = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { data, isLoading, error } = useQuery({
    queryKey: ["activity", campaign],
    enabled: Boolean(client),
    queryFn: () => {
      if (!client) throw new Error("Arc RPC unavailable");
      return loadActivity(client, campaign);
    },
    refetchInterval: 60_000,
  });

  return (
    <section>
      <div className="mb-5">
        <p className="eyebrow">Reconciled event log</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Onchain activity</h2>
      </div>
      {isLoading ? (
        <div className="skeleton h-48" />
      ) : error ? (
        <div className="panel p-5 text-sm text-rose-200">
          Activity could not be queried from Arcscan or Arc RPC.
        </div>
      ) : !data?.length ? (
        <div className="panel p-6 text-sm text-stone-500">No events found in the configured indexing window.</div>
      ) : (
        <div className="panel divide-y divide-white/7">
          {data.map((item) => (
            <a
              key={item.id}
              href={explorerTx(item.txHash)}
              target="_blank"
              rel="noreferrer"
              className="flex gap-4 p-4 hover:bg-white/3"
            >
              <span className="mt-1 size-2 shrink-0 rounded-full bg-lime-300/80" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{item.title}</span>
                <span className="mt-1 block break-words text-xs text-stone-500">{item.detail}</span>
                {item.reference && (
                  <span className="mt-2 inline-block max-w-full break-all rounded-md bg-lime-300/8 px-2 py-1 font-mono text-[10px] text-lime-200">
                    ref {item.reference}
                  </span>
                )}
              </span>
              <span className="ml-auto shrink-0 text-[10px] text-stone-600">#{item.blockNumber.toString()}</span>
            </a>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-stone-600">
        Indexed through Arcscan with direct Arc RPC fallback. Events are reconciled by transaction hash and log index.
      </p>
      {deploymentBlock === 0n && (
        <p className="mt-3 text-[11px] text-stone-600">
          Indexing is limited to the latest 100,000 blocks until NEXT_PUBLIC_DEPLOYMENT_BLOCK is configured.
        </p>
      )}
    </section>
  );
}
