"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { shorten } from "@/lib/format";

export function Header() {
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== ARC_CHAIN_ID;
  const availableConnectors = connectors.filter(
    (connector, index, list) => list.findIndex((item) => item.id === connector.id) === index,
  );

  function navLink(href: string, label: string) {
    return <Link href={href} onClick={() => setMobileMenuOpen(false)} className="transition hover:text-white">{label}</Link>;
  }

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
            {navLink("/campaigns", "Explore")}
            {navLink("/create", "Create")}
            {navLink("/dashboard", "Dashboard")}
          </nav>

          <div className="flex items-center gap-2">
          {!isConnected ? (
            <button
              className="button-secondary"
              disabled={availableConnectors.length === 0 || isPending}
              onClick={() => setWalletMenuOpen((open) => !open)}
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
            <button
              className="button-secondary px-3 md:hidden"
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>
        {walletMenuOpen && !isConnected && (
          <div className="shell pb-4">
            <div className="ml-auto grid max-w-sm gap-2 rounded-xl border border-white/10 bg-[#0d1a14] p-3 shadow-2xl">
              <p className="px-2 text-xs text-stone-500">Choose a wallet. Memo and batch routes require an EOA.</p>
              {availableConnectors.map((connector) => (
                <button
                  key={connector.uid}
                  className="button-secondary w-full justify-start"
                  onClick={() => {
                    connect({ connector });
                    setWalletMenuOpen(false);
                  }}
                >
                  {connector.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {mobileMenuOpen && (
          <nav className="shell grid gap-3 border-t border-white/8 py-4 text-sm text-stone-300 md:hidden">
            {navLink("/campaigns", "Explore campaigns")}
            {navLink("/create", "Create campaign")}
            {navLink("/dashboard", "Dashboard")}
          </nav>
        )}
      </header>
      {wrongNetwork && (
        <div className="border-b border-amber-300/20 bg-amber-300/10 px-4 py-2 text-center text-xs text-amber-100">
          Wrong network. FundSpring transactions are available on Arc Testnet only.
        </div>
      )}
    </>
  );
}
