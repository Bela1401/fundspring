"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { ARC_CHAIN_ID, factoryAddress } from "@/lib/arc";
import { loadCampaigns } from "@/lib/campaigns";

export function useCampaigns() {
  const client = usePublicClient({ chainId: ARC_CHAIN_ID });
  return useQuery({
    queryKey: ["campaigns", factoryAddress],
    enabled: Boolean(client && factoryAddress),
    queryFn: async () => {
      const configuredFactory = factoryAddress;
      if (!client || !configuredFactory) throw new Error("Factory not configured");
      const block = await client.getBlock({ blockTag: "latest" });
      return {
        blockNumber: block.number,
        timestamp: block.timestamp,
        campaigns: await loadCampaigns(client, configuredFactory, block.number),
      };
    },
    refetchInterval: 60_000,
  });
}
