import { describe, expect, it } from "vitest";
import { formatDeadline, formatUsdc } from "../lib/format";

describe("onchain value formatting", () => {
  it("formats uint256-scale USDC without converting through Number", () => {
    expect(formatUsdc(123_456_789_012_345_678_901_234n)).toBe(
      "123,456,789,012,345,678.9",
    );
  });

  it("rounds display fractions entirely in bigint space", () => {
    expect(formatUsdc(1_999_999n)).toBe("2");
    expect(formatUsdc(1_234_567n, 4)).toBe("1.2346");
  });

  it("falls back to the raw unix value when a uint64 deadline exceeds Date range", () => {
    expect(formatDeadline(18_446_744_073_709_551_615n)).toBe(
      "Unix time 18446744073709551615",
    );
  });
});
