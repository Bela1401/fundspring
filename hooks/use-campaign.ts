"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { loadCampaign } from "@/lib/campaigns";

export function useCampaign(address: Address) {
  const client = usePublicClient({ chainId: ARC_CHAIN_ID });
  return useQuery({
    queryKey: ["campaign", address],
    enabled: Boolean(client),
    queryFn: async () => {
      if (!client) throw new Error("Arc RPC unavailable");
      const block = await client.getBlock({ blockTag: "latest" });
      return {
        blockNumber: block.number,
        timestamp: block.timestamp,
        campaign: await loadCampaign(client, address, block.number),
      };
    },
    refetchInterval: 15_000,
  });
}
