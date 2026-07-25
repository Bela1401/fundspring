import { describe, expect, it } from "vitest";
import { parseCampaignMetadata } from "../lib/metadata";

describe("parseCampaignMetadata", () => {
  it("accepts concise HTTPS campaign metadata", () => {
    expect(parseCampaignMetadata({
      name: "Community solar",
      description: "A transparent community campaign with measurable outcomes.",
      image: "https://example.org/cover.png",
      external_url: "https://example.org/project",
    })).toMatchObject({ name: "Community solar", image: "https://example.org/cover.png" });
  });

  it("rejects missing or short descriptions", () => {
    expect(parseCampaignMetadata({ description: "Too short" })).toBeNull();
  });

  it("drops unsafe optional URLs", () => {
    expect(parseCampaignMetadata({
      description: "A sufficiently detailed campaign description for testing.",
      external_url: "javascript:alert(1)",
      image: "http://example.org/image.png",
    })).toEqual({
      name: undefined,
      description: "A sufficiently detailed campaign description for testing.",
      external_url: undefined,
      image: undefined,
    });
  });
});
