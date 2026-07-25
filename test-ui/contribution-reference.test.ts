import { describe, expect, it } from "vitest";
import { buildContributionMemo } from "../lib/contribution-reference";

const campaign = "0x1111111111111111111111111111111111111111";
const contributor = "0x2222222222222222222222222222222222222222";

describe("buildContributionMemo", () => {
  it("is deterministic and campaign-specific", () => {
    const first = buildContributionMemo(campaign, contributor, "FS-123");
    const second = buildContributionMemo(campaign, contributor, "FS-123");
    const other = buildContributionMemo(
      "0x3333333333333333333333333333333333333333",
      contributor,
      "FS-123",
    );
    expect(first).toEqual(second);
    expect(first.memoId).not.toBe(other.memoId);
  });

  it("rejects empty and oversized references", () => {
    expect(() => buildContributionMemo(campaign, contributor, "")).toThrow();
    expect(() => buildContributionMemo(campaign, contributor, "x".repeat(49))).toThrow();
  });
});
