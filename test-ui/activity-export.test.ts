import { describe, expect, it } from "vitest";
import { buildActivityCsv, type ActivityRecord } from "../lib/activity-export";

const activity: ActivityRecord = {
  id: "event-1",
  blockNumber: 53_586_700n,
  logIndex: 4,
  emitterAddress: "0x2112eFE5f68F7f9d42596324230197890A29f5ab",
  txHash: "0xabc",
  kind: "contribution",
  title: "10 USDC contributed",
  detail: 'From 0x1234, note "verified"',
  reference: "FS-2026-001",
};

describe("activity CSV export", () => {
  it("exports canonical event identity and explorer evidence", () => {
    const csv = buildActivityCsv([activity], (hash) => `https://explorer.example/tx/${hash}`);

    expect(csv).toContain('"block_number","log_index","emitter_address","event_type"');
    expect(csv).toContain('"53586700","4","0x2112eFE5f68F7f9d42596324230197890A29f5ab","contribution"');
    expect(csv).toContain('"From 0x1234, note ""verified"""');
    expect(csv).toContain('"FS-2026-001"');
    expect(csv).toContain('"https://explorer.example/tx/0xabc"');
  });

  it("neutralizes spreadsheet formulas in user-controlled fields", () => {
    const formulaCsv = buildActivityCsv(
      [{ ...activity, title: " =HYPERLINK(\"https://bad.example\")" }],
      () => "https://explorer.example",
    );
    const controlCsv = buildActivityCsv(
      [{ ...activity, reference: "\t=1+1" }],
      () => "https://explorer.example",
    );
    const localizedCsv = buildActivityCsv(
      [{ ...activity, reference: "＠SUM(A1:A2)" }],
      () => "https://explorer.example",
    );

    expect(formulaCsv).toContain('"\' =HYPERLINK(""https://bad.example"")"');
    expect(controlCsv).toContain('"\'\t=1+1"');
    expect(localizedCsv).toContain('"\'＠SUM(A1:A2)"');
  });
});
