import { isAddress, type Address } from "viem";
import { arcTestnet } from "viem/chains";

export const ARC_CHAIN_ID = 5_042_002;
export const ARC_RPC_URL =
  process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.drpc.testnet.arc.io";
export const ARC_EXPLORER_URL =
  process.env.NEXT_PUBLIC_ARC_EXPLORER_URL ?? "https://testnet.arcscan.app";
export const ARC_USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as const;
export const ARC_MEMO_ADDRESS =
  "0x5294E9927c3306DcBaDb03fe70b92e01cCede505" as const;
export const ARC_MULTICALL3FROM_ADDRESS =
  "0x522fAf9A91c41c443c66765030741e4AaCe147D0" as const;

function verifiedAddress(
  value: string | undefined,
  fallback: Address,
  label: string,
): Address {
  if (!value) return fallback;
  if (!isAddress(value)) throw new Error(`${label} is not a valid address`);
  if (value.toLowerCase() !== fallback.toLowerCase()) {
    throw new Error(`${label} does not match the verified Arc Testnet address`);
  }
  return value;
}

export const usdcAddress = verifiedAddress(
  process.env.NEXT_PUBLIC_USDC_ADDRESS,
  ARC_USDC_ADDRESS,
  "NEXT_PUBLIC_USDC_ADDRESS",
);
export const memoAddress = verifiedAddress(
  process.env.NEXT_PUBLIC_MEMO_ADDRESS,
  ARC_MEMO_ADDRESS,
  "NEXT_PUBLIC_MEMO_ADDRESS",
);
export const multicall3FromAddress = verifiedAddress(
  process.env.NEXT_PUBLIC_MULTICALL3FROM_ADDRESS,
  ARC_MULTICALL3FROM_ADDRESS,
  "NEXT_PUBLIC_MULTICALL3FROM_ADDRESS",
);

const configuredFactory = process.env.NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS;
export const factoryAddress: Address | undefined =
  configuredFactory && isAddress(configuredFactory)
    ? configuredFactory
    : undefined;

const configuredBlock = process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK;
export const deploymentBlock =
  configuredBlock && /^\d+$/.test(configuredBlock)
    ? BigInt(configuredBlock)
    : 0n;

export const arcChain = arcTestnet;

export function explorerTx(hash: string): string {
  return `${ARC_EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddress(address: string): string {
  return `${ARC_EXPLORER_URL}/address/${address}`;
}
