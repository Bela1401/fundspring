"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { errorMessage, shorten } from "@/lib/format";
import { OPEN_WALLET_MENU_EVENT } from "@/lib/wallet-events";

export function Header() {
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [networkError, setNetworkError] = useState("");
  const walletMenuRef = useRef<HTMLDivElement>(null);
  const firstConnectorRef = useRef<HTMLButtonElement>(null);
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== ARC_CHAIN_ID;
  const availableConnectors = connectors.filter(
    (connector, index, list) => list.findIndex((item) => item.id === connector.id) === index,
  );

  useEffect(() => {
    const openWalletMenu = () => {
      setWalletError("");
      setMobileMenuOpen(false);
      setWalletMenuOpen(true);
    };
    window.addEventListener(OPEN_WALLET_MENU_EVENT, openWalletMenu);
    return () => window.removeEventListener(OPEN_WALLET_MENU_EVENT, openWalletMenu);
  }, []);

  useEffect(() => {
    if (!walletMenuOpen) return;
    const frame = window.requestAnimationFrame(() => {
      (firstConnectorRef.current ?? walletMenuRef.current)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [walletMenuOpen]);

  useEffect(() => {
    if (isConnected && chainId !== ARC_CHAIN_ID) return;
    const frame = window.requestAnimationFrame(() => setNetworkError(""));
    return () => window.cancelAnimationFrame(frame);
  }, [chainId, isConnected]);

  async function connectWallet(connector: (typeof availableConnectors)[number]) {
    setWalletError("");
    try {
      await connectAsync({ connector });
      setWalletMenuOpen(false);
    } catch (error) {
      setWalletError(errorMessage(error));
      setWalletMenuOpen(true);
    }
  }

  async function switchToArc() {
    setNetworkError("");
    try {
      await switchChainAsync({ chainId: ARC_CHAIN_ID });
    } catch (error) {
      setNetworkError(errorMessage(error));
    }
  }

  function disconnectWallet() {
    setNetworkError("");
    setWalletError("");
    setWalletMenuOpen(false);
    disconnect();
  }

  function navLink(href: string, label: string) {
    return <Link href={href} onClick={() => { setMobileMenuOpen(false); setWalletMenuOpen(false); }} className="transition hover:text-white">{label}</Link>;
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07110d]/90 backdrop-blur-xl">
        <div className="shell flex h-18 items-center justify-between gap-2">
          <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="FundSpring home" onClick={() => { setMobileMenuOpen(false); setWalletMenuOpen(false); }}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime-300 font-black text-emerald-950 shadow-[0_0_28px_rgba(190,242,100,.18)]">
              F
            </span>
            <span className="hidden sm:block">
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

          <div className="flex shrink-0 items-center gap-2">
          {!isConnected ? (
            <button
              type="button"
              className="button-secondary whitespace-nowrap"
              disabled={availableConnectors.length === 0 || isPending}
              aria-expanded={walletMenuOpen}
              aria-controls="wallet-connection-menu"
              onClick={() => {
                setWalletError("");
                setMobileMenuOpen(false);
                setWalletMenuOpen((open) => !open);
              }}
            >
              {isPending ? (
                "Opening…"
              ) : (
                <>
                  <span className="sm:hidden">Connect</span>
                  <span className="hidden sm:inline">Connect wallet</span>
                </>
              )}
            </button>
          ) : wrongNetwork ? (
            <>
              <button
                type="button"
                className="button-warning whitespace-nowrap"
                aria-label="Switch to Arc Testnet"
                disabled={isSwitching}
                onClick={() => void switchToArc()}
              >
                {isSwitching ? (
                  "Switching…"
                ) : (
                  <>
                    <span className="sm:hidden">Arc</span>
                    <span className="hidden sm:inline">Switch to Arc Testnet</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="button-secondary whitespace-nowrap px-3"
                aria-label="Disconnect wallet"
                onClick={disconnectWallet}
              >
                <span aria-hidden="true" className="sm:hidden">×</span>
                <span className="hidden sm:inline">Disconnect</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="wallet-pill whitespace-nowrap"
              aria-label="Disconnect wallet"
              onClick={disconnectWallet}
            >
              <span className="size-2 rounded-full bg-lime-300" />
              {address ? shorten(address) : "Connected"}
            </button>
          )}
            <span className="md:hidden">
              <button
                type="button"
                className="button-secondary whitespace-nowrap px-3"
                aria-label="Toggle navigation"
                aria-expanded={mobileMenuOpen}
                onClick={() => {
                  setWalletMenuOpen(false);
                  setMobileMenuOpen((open) => !open);
                }}
              >
                {mobileMenuOpen ? "Close" : "Menu"}
              </button>
            </span>
          </div>
        </div>
        {walletMenuOpen && !isConnected && (
          <div className="shell pb-4">
            <div ref={walletMenuRef} id="wallet-connection-menu" tabIndex={-1} className="ml-auto grid max-w-sm gap-2 rounded-xl border border-white/10 bg-[#0d1a14] p-3 shadow-2xl">
              <p className="px-2 text-xs text-stone-500">Choose a wallet. Memo and batch routes require an EOA.</p>
              {availableConnectors.map((connector, index) => (
                <button
                  type="button"
                  key={connector.uid}
                  ref={index === 0 ? firstConnectorRef : undefined}
                  className="button-secondary w-full justify-start"
                  disabled={isPending}
                  onClick={() => void connectWallet(connector)}
                >
                  {connector.name}
                </button>
              ))}
              {walletError && (
                <p className="rounded-lg bg-rose-400/8 px-3 py-2 text-xs leading-5 text-rose-100" role="alert">
                  {walletError}
                </p>
              )}
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
      {wrongNetwork && networkError && (
        <div className="border-b border-rose-300/20 bg-rose-300/10 px-4 py-2 text-center text-xs text-rose-100" role="alert">
          Could not switch networks: {networkError}
        </div>
      )}
    </>
  );
}
