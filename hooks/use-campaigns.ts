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
    queryFn: () => {
      if (!client || !factoryAddress) throw new Error("Factory not configured");
      return loadCampaigns(client, factoryAddress);
    },
    refetchInterval: 12_000,
  });
}

