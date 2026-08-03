import { getAddress, type Address, type Hex, type Log } from "viem";
import { ARC_EXPLORER_URL } from "./arc";

interface ArcscanLog {
  address: string;
  blockHash?: Hex;
  blockNumber: Hex;
  data: Hex;
  logIndex: Hex;
  topics: Hex[];
  transactionHash: Hex;
  transactionIndex?: Hex;
}

interface ArcscanLogResponse {
  status: string;
  message: string;
  result: ArcscanLog[] | string | null;
}

interface ArcscanLogQuery {
  address: Address;
  fromBlock: bigint;
  topics?: Partial<Record<0 | 1 | 2 | 3, Hex>>;
}

export function addressTopic(address: Address): Hex {
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}` as Hex;
}

export function normalizeArcscanLog(log: ArcscanLog): Log {
  return {
    address: getAddress(log.address),
    blockHash: log.blockHash ?? null,
    blockNumber: BigInt(log.blockNumber),
    data: log.data,
    logIndex: Number(BigInt(log.logIndex)),
    removed: false,
    topics: log.topics as [Hex, ...Hex[]],
    transactionHash: log.transactionHash,
    transactionIndex: Number(BigInt(log.transactionIndex ?? "0x0")),
  } as Log;
}

export async function fetchArcscanLogs({
  address,
  fromBlock,
  topics = {},
}: ArcscanLogQuery): Promise<Log[]> {
  const url = new URL(`${ARC_EXPLORER_URL}/api`);
  url.searchParams.set("module", "logs");
  url.searchParams.set("action", "getLogs");
  url.searchParams.set("fromBlock", fromBlock.toString());
  url.searchParams.set("toBlock", "latest");
  url.searchParams.set("address", address);

  const topicIndexes = Object.keys(topics)
    .map(Number)
    .sort((a, b) => a - b) as Array<0 | 1 | 2 | 3>;
  for (const index of topicIndexes) {
    url.searchParams.set(`topic${index}`, topics[index]!);
  }
  for (let index = 1; index < topicIndexes.length; index += 1) {
    const left = topicIndexes[index - 1];
    const right = topicIndexes[index];
    url.searchParams.set(`topic${left}_${right}_opr`, "and");
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    // Indexed USDC topic queries can take longer than simple address lookups.
    // Keep this above the wallet transport timeout so a healthy Arcscan query
    // does not unnecessarily trigger the more expensive direct-RPC fallback.
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    throw new Error(`Arcscan logs request failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as ArcscanLogResponse;
  if (Array.isArray(payload.result)) {
    return payload.result.map(normalizeArcscanLog);
  }
  if (
    payload.status === "0" &&
    typeof payload.result === "string" &&
    /no (logs|records)/i.test(payload.result)
  ) {
    return [];
  }
  throw new Error(`Arcscan logs request failed: ${payload.message}`);
}
