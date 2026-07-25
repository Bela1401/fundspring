"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, fallback, http } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { arbitrumSepolia, baseSepolia, mainnet, sepolia } from "viem/chains";
import { ARC_RPC_URL, arcChain } from "@/lib/arc";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const publicArcTransports =
  ARC_RPC_URL === "https://rpc.testnet.arc.network"
    ? [
        http("https://rpc.drpc.testnet.arc.network"),
        http("https://rpc.blockdaemon.testnet.arc.network"),
        http(ARC_RPC_URL),
      ]
    : [
        http(ARC_RPC_URL),
        http("https://rpc.drpc.testnet.arc.network"),
        http("https://rpc.blockdaemon.testnet.arc.network"),
      ];
const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: "FundSpring" }),
  ...(walletConnectProjectId
    ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: true })]
    : []),
];

const config = createConfig({
  chains: [arcChain, sepolia, baseSepolia, arbitrumSepolia, mainnet],
  connectors,
  transports: {
    [arcChain.id]: fallback(publicArcTransports),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [mainnet.id]: http("https://cloudflare-eth.com"),
  },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            retryDelay: (attempt) => 1_500 * (attempt + 1),
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
