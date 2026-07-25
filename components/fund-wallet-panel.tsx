"use client";

import { useState } from "react";
import { parseUnits, type EIP1193Provider } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { errorMessage } from "@/lib/format";

const SOURCES = [
  { chainId: 11_155_111, kit: "Ethereum_Sepolia", label: "Ethereum Sepolia" },
  { chainId: 84_532, kit: "Base_Sepolia", label: "Base Sepolia" },
  { chainId: 421_614, kit: "Arbitrum_Sepolia", label: "Arbitrum Sepolia" },
] as const;

type FundingState =
  | { phase: "idle" }
  | { phase: "working"; message: string }
  | { phase: "success"; message: string }
  | { phase: "error"; message: string };

export function FundWalletPanel() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("1");
  const [sourceIndex, setSourceIndex] = useState(0);
  const [state, setState] = useState<FundingState>({ phase: "idle" });
  const { address, connector, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const source = SOURCES[sourceIndex] ?? SOURCES[0]!;

  async function bridge() {
    if (!address || !connector) return;
    try {
      if (parseUnits(amount, 6) <= 0n) throw new Error("Enter a positive USDC amount.");
      setState({ phase: "working", message: `Switching to ${source.label}…` });
      await switchChainAsync({ chainId: source.chainId });

      const provider = (await connector.getProvider()) as EIP1193Provider | undefined;
      if (!provider) throw new Error("The wallet did not expose an EIP-1193 provider.");
      const [{ AppKit, BridgeChain }, { createViemAdapterFromProvider }] = await Promise.all([
        import("@circle-fin/app-kit"),
        import("@circle-fin/adapter-viem-v2"),
      ]);
      const adapter = await createViemAdapterFromProvider({ provider });
      const kit = new AppKit();
      setState({
        phase: "working",
        message: "Approve the bridge steps in your wallet. Bridge and contribution are separate operations.",
      });
      const result = await kit.bridge({
        from: { adapter, chain: source.kit },
        to: {
          recipientAddress: address,
          chain: BridgeChain.Arc_Testnet,
          useForwarder: true,
        },
        amount,
      });
      if (result.state !== "success") {
        const failed = result.steps.find((step) => step.state === "error");
        throw new Error(failed?.errorMessage ?? "The bridge did not complete.");
      }
      await switchChainAsync({ chainId: ARC_CHAIN_ID });
      setState({
        phase: "success",
        message: "Bridge completed. Arc USDC balance will refresh before you contribute.",
      });
    } catch (error) {
      setState({ phase: "error", message: errorMessage(error) });
    }
  }

  if (!open) {
    return (
      <div className="mt-3 grid gap-2">
        <button className="button-secondary w-full" onClick={() => setOpen(true)}>
          Fund wallet from another network
        </button>
        <a className="text-center text-xs text-lime-200" href="https://faucet.circle.com" target="_blank" rel="noreferrer">
          Get Arc Testnet USDC from Circle Faucet ↗
        </a>
      </div>
    );
  }

  return (
    <div className="panel mt-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label mb-0">Fund with Circle App Kit</p>
          <p className="mt-1 text-xs text-stone-500">Bridge testnet USDC first, then contribute separately.</p>
        </div>
        <button className="text-xs text-stone-500 hover:text-white" onClick={() => setOpen(false)}>Close</button>
      </div>
      <label className="mt-4 block">
        <span className="label">Source network</span>
        <select className="field" value={sourceIndex} onChange={(event) => setSourceIndex(Number(event.target.value))}>
          {SOURCES.map((chain, index) => <option key={chain.kit} value={index}>{chain.label}</option>)}
        </select>
      </label>
      <label className="mt-3 block">
        <span className="label">Amount</span>
        <input className="field" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </label>
      <button
        className="button-primary mt-4 w-full"
        disabled={!isConnected || state.phase === "working"}
        onClick={() => void bridge()}
      >
        {!isConnected ? "Connect wallet first" : state.phase === "working" ? "Bridge in progress…" : "Review bridge"}
      </button>
      <p className="mt-3 text-xs leading-5 text-stone-500">
        Source-network fees are separate. Arc contribution fees are paid in USDC. This bridge is not atomic with a FundSpring contribution.
      </p>
      {state.phase !== "idle" && (
        <p className={`mt-3 text-xs ${state.phase === "error" ? "text-rose-200" : state.phase === "success" ? "text-lime-200" : "text-stone-300"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
