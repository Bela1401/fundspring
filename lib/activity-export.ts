import type { Address, Hex } from "viem";

export interface ActivityRecord {
  id: string;
  blockNumber: bigint;
  logIndex: number;
  emitterAddress: Address;
  txHash: Hex;
  kind: string;
  title: string;
  detail: string;
  reference?: string;
}

function safeSpreadsheetValue(value: string): string {
  return /^[\t\r\n]/.test(value) || /^\s*[=+\-@＝＋－＠]/.test(value)
    ? `'${value}`
    : value;
}

function csvCell(value: string | number | bigint | undefined): string {
  const normalized = safeSpreadsheetValue(value === undefined ? "" : String(value));
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function buildActivityCsv(
  records: ActivityRecord[],
  explorerUrlForTransaction: (transactionHash: Hex) => string,
): string {
  const header = [
    "block_number",
    "log_index",
    "emitter_address",
    "event_type",
    "title",
    "detail",
    "memo_reference",
    "transaction_hash",
    "explorer_url",
  ];
  const rows = records.map((record) => [
    record.blockNumber,
    record.logIndex,
    record.emitterAddress,
    record.kind,
    record.title,
    record.detail,
    record.reference,
    record.txHash,
    explorerUrlForTransaction(record.txHash),
  ]);

  return `\uFEFF${[header, ...rows]
    .map((row) => row.map((value) => csvCell(value)).join(","))
    .join("\r\n")}\r\n`;
}
