import type { Address } from "viem";

export const campaignStatuses = [
  "Active",
  "Successful",
  "Failed",
  "Cancelled",
] as const;

export function formatUsdc(value: bigint, maximumFractionDigits = 2): string {
  const fractionDigits = Math.max(0, Math.min(6, Math.trunc(maximumFractionDigits)));
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const roundingFactor = 10n ** BigInt(6 - fractionDigits);
  const rounded = fractionDigits === 6
    ? absolute
    : (absolute + roundingFactor / 2n) / roundingFactor;
  const displayScale = 10n ** BigInt(fractionDigits);
  const whole = fractionDigits === 0 ? rounded : rounded / displayScale;
  const groupedWhole = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = fractionDigits === 0
    ? ""
    : (rounded % displayScale)
      .toString()
      .padStart(fractionDigits, "0")
      .replace(/0+$/, "");
  return `${negative ? "-" : ""}${groupedWhole}${fraction ? `.${fraction}` : ""}`;
}

export function shorten(address: Address | string, size = 4): string {
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

export function formatDeadline(unixSeconds: bigint): string {
  const maxDateSeconds = 8_640_000_000_000n;
  if (unixSeconds < -maxDateSeconds || unixSeconds > maxDateSeconds) {
    return `Unix time ${unixSeconds.toString()}`;
  }
  const date = new Date(Number(unixSeconds) * 1_000);
  if (Number.isNaN(date.getTime())) return `Unix time ${unixSeconds.toString()}`;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
