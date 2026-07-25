"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { mainnet } from "viem/chains";
import { ARC_RPC_URL, arcChain } from "@/lib/arc";

const config = createConfig({
  chains: [arcChain, mainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [arcChain.id]: http(ARC_RPC_URL),
    [mainnet.id]: http("https://cloudflare-eth.com"),
  },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

