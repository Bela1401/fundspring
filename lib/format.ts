import { formatUnits, type Address } from "viem";

export const campaignStatuses = [
  "Active",
  "Successful",
  "Failed",
  "Cancelled",
] as const;

export function formatUsdc(value: bigint, maximumFractionDigits = 2): string {
  return Number(formatUnits(value, 6)).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

export function shorten(address: Address | string, size = 4): string {
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

export function formatDeadline(unixSeconds: bigint): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(unixSeconds) * 1_000));
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (/user rejected|user denied/i.test(error.message)) {
      return "The wallet request was rejected.";
    }
    const short = error.message.split("\n")[0];
    return short?.replace("ContractFunctionExecutionError: ", "") ?? error.message;
  }
  return "The transaction could not be completed.";
}

