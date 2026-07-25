"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { shorten } from "@/lib/format";

export function Header() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== ARC_CHAIN_ID;
  const connector = connectors[0];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07110d]/90 backdrop-blur-xl">
        <div className="shell flex h-18 items-center justify-between">
          <Link href="/" className="group flex items-center gap-3" aria-label="FundSpring home">
            <span className="grid size-9 place-items-center rounded-xl bg-lime-300 font-black text-emerald-950 shadow-[0_0_28px_rgba(190,242,100,.18)]">
              F
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight text-white">
                FundSpring
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-lime-200/70">
                Built on Arc
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-stone-300 md:flex">
            <Link href="/campaigns" className="transition hover:text-white">Explore</Link>
            <Link href="/create" className="transition hover:text-white">Create</Link>
            <Link href="/dashboard" className="transition hover:text-white">Dashboard</Link>
          </nav>

          {!isConnected ? (
            <button
              className="button-secondary"
              disabled={!connector || isPending}
              onClick={() => connector && connect({ connector })}
            >
              {isPending ? "Opening wallet…" : "Connect wallet"}
            </button>
          ) : wrongNetwork ? (
            <button
              className="button-warning"
              disabled={isSwitching}
              onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}
            >
              {isSwitching ? "Switching…" : "Switch to Arc Testnet"}
            </button>
          ) : (
            <button className="wallet-pill" onClick={() => disconnect()}>
              <span className="size-2 rounded-full bg-lime-300" />
              {address ? shorten(address) : "Connected"}
            </button>
          )}
        </div>
      </header>
      {wrongNetwork && (
        <div className="border-b border-amber-300/20 bg-amber-300/10 px-4 py-2 text-center text-xs text-amber-100">
          Wrong network. FundSpring transactions are available on Arc Testnet only.
        </div>
      )}
    </>
  );
}

