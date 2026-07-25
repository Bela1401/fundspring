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
    queryFn: () => {
      if (!client) throw new Error("Arc RPC unavailable");
      return loadCampaign(client, address);
    },
    refetchInterval: 60_000,
  });
}
