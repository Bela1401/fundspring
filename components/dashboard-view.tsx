"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { CampaignCard } from "./campaign-card";
import { DeploymentPending } from "./empty-state";
import { useCampaigns } from "@/hooks/use-campaigns";
import { ARC_CHAIN_ID, factoryAddress } from "@/lib/arc";
import { campaignAbi } from "@/lib/contracts";
import type { CampaignSummary } from "@/lib/campaigns";
import { errorMessage, formatUsdc } from "@/lib/format";
import { requestWalletConnection } from "@/lib/wallet-events";
import { useWatchlist } from "@/hooks/use-watchlist";

interface FundedCampaign {
  campaign: CampaignSummary;
  contribution: bigint;
  canRefund: boolean;
}

const DASHBOARD_READ_CONCURRENCY = 6;

export function DashboardView() {
  const [savedAnnouncement, setSavedAnnouncement] = useState("");
  const savedHeadingRef = useRef<HTMLHeadingElement>(null);
  const { address } = useAccount();
  const client = usePublicClient({ chainId: ARC_CHAIN_ID });
  const campaigns = useCampaigns();
  const watchlist = useWatchlist();
  const funded = useQuery({
    queryKey: ["funded-campaigns", address],
    enabled: Boolean(client && address && campaigns.data),
    queryFn: async (): Promise<FundedCampaign[]> => {
      if (!client || !address || !campaigns.data) return [];
      const snapshot = campaigns.data;
      const records: FundedCampaign[] = [];
      for (
        let offset = 0;
        offset < snapshot.campaigns.length;
        offset += DASHBOARD_READ_CONCURRENCY
      ) {
        const batch = snapshot.campaigns.slice(
          offset,
          offset + DASHBOARD_READ_CONCURRENCY,
        );
        records.push(...(await Promise.all(batch.map(async (campaign) => {
          const [contribution, canRefund] = await client.multicall({
            allowFailure: false,
            blockNumber: snapshot.blockNumber,
            contracts: [
              {
                address: campaign.address,
                abi: campaignAbi,
                functionName: "contributionOf",
                args: [address],
              },
              {
                address: campaign.address,
                abi: campaignAbi,
                functionName: "canClaimRefund",
                args: [address],
              },
            ],
          });
          return {
            campaign,
            contribution: contribution as bigint,
            canRefund: canRefund as boolean,
          };
        }))));
      }
      return records.filter((record) => record.contribution > 0n);
    },
  });
  const campaignBlockNumber = campaigns.data?.blockNumber;
  const refetchFunded = funded.refetch;
  useEffect(() => {
    if (!client || !address || campaignBlockNumber === undefined) return;
    void refetchFunded();
  }, [address, campaignBlockNumber, client, refetchFunded]);

  if (!factoryAddress) return <DeploymentPending />;
  const blockingCampaignError = campaigns.error && !campaigns.data
    ? campaigns.error
    : null;
  const blockingFundedError = address && funded.error && !funded.data
    ? funded.error
    : null;
  const rpcError = blockingCampaignError ?? blockingFundedError;
  if (rpcError) {
    const retrying = campaigns.isFetching || funded.isFetching;
    return (
      <div className="panel p-10 text-center" role="alert">
        <h2 className="text-2xl font-semibold text-white">Dashboard data could not be loaded</h2>
        <p className="mt-2 text-sm text-rose-100">Arc RPC error: {errorMessage(rpcError)}</p>
        <button
          type="button"
          className="button-secondary mt-6"
          disabled={retrying}
          onClick={() => {
            if (blockingCampaignError) void campaigns.refetch();
            if (blockingFundedError) void funded.refetch();
          }}
        >
          {retrying ? "Retrying…" : "Retry dashboard data"}
        </button>
      </div>
    );
  }
  if (campaigns.isLoading || (address && funded.isLoading)) {
    return (
      <div className="skeleton h-96" role="status" aria-live="polite">
        <span className="sr-only">Loading dashboard data from Arc.</span>
      </div>
    );
  }

  const registry = campaigns.data?.campaigns ?? [];
  const snapshotTime = campaigns.data?.timestamp;
  const staleError = campaigns.error ?? (address ? funded.error : null);
  const staleWarning = staleError ? (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between" role="status">
      <p>Showing the last completed dashboard snapshot because the latest Arc refresh failed.</p>
      <button
        type="button"
        className="button-secondary shrink-0"
        disabled={campaigns.isFetching || funded.isFetching}
        onClick={() => {
          if (campaigns.error) void campaigns.refetch();
          if (funded.error) void funded.refetch();
        }}
      >
        {campaigns.isFetching || funded.isFetching ? "Retrying…" : "Retry refresh"}
      </button>
    </div>
  ) : null;
  const saved = registry.filter((campaign) => watchlist.isWatched(campaign.address));
  function handleSavedToggle(title: string, watched: boolean) {
    if (watched) return;
    setSavedAnnouncement(`${title} removed from saved campaigns.`);
    window.requestAnimationFrame(() => savedHeadingRef.current?.focus());
  }
  if (!address) {
    return (
      <div className="space-y-14">
        <p className="sr-only" aria-live="polite">{savedAnnouncement}</p>
        {staleWarning}
        <DashboardSection title="Saved campaigns" count={saved.length} headingRef={savedHeadingRef}>
          {saved.map((campaign) => (
            <CampaignCard
              key={campaign.address}
              campaign={campaign}
              snapshotTime={snapshotTime}
              onWatchToggle={(watched) => handleSavedToggle(campaign.title, watched)}
            />
          ))}
        </DashboardSection>
        <div className="panel p-10 text-center">
          <h2 className="text-2xl font-semibold text-white">Connect your wallet</h2>
          <p className="mt-2 text-stone-400">Saved campaigns stay available on this browser. Connect to add your creator, contributor, refund, and beneficiary views.</p>
          <button
            type="button"
            className="button-primary mt-6"
            onClick={requestWalletConnection}
          >
            Connect wallet
          </button>
        </div>
      </div>
    );
  }

  const created = registry.filter(
    (campaign) => campaign.creator.toLowerCase() === address.toLowerCase(),
  );
  const refunds = funded.data?.filter((record) => record.canRefund) ?? [];
  const claims = registry.filter(
    (campaign) =>
      campaign.beneficiary.toLowerCase() === address.toLowerCase() &&
      campaign.status === 1 &&
      campaign.amountClaimed === 0n,
  );

  return (
    <div className="space-y-14">
      <p className="sr-only" aria-live="polite">{savedAnnouncement}</p>
      {staleWarning}
      <DashboardSection title="Saved campaigns" count={saved.length} headingRef={savedHeadingRef}>
        {saved.map((campaign) => (
          <CampaignCard
            key={campaign.address}
            campaign={campaign}
            snapshotTime={snapshotTime}
            onWatchToggle={(watched) => handleSavedToggle(campaign.title, watched)}
          />
        ))}
      </DashboardSection>
      <DashboardSection title="Created by you" count={created.length}>
        {created.map((campaign) => <CampaignCard key={campaign.address} campaign={campaign} snapshotTime={snapshotTime} />)}
      </DashboardSection>
      <DashboardSection title="Funded by you" count={funded.data?.length ?? 0}>
        {funded.data?.map(({ campaign, contribution }) => (
          <div key={campaign.address}>
            <CampaignCard campaign={campaign} snapshotTime={snapshotTime} />
            <p className="pointer-events-none -mt-12 px-6 pb-5 text-xs text-lime-200">Your contribution: {formatUsdc(contribution)} USDC</p>
          </div>
        ))}
      </DashboardSection>
      <DashboardSection title="Refunds available" count={refunds.length}>
        {refunds.map(({ campaign }) => <CampaignCard key={campaign.address} campaign={campaign} snapshotTime={snapshotTime} />)}
      </DashboardSection>
      <DashboardSection title="Beneficiary claims ready" count={claims.length}>
        {claims.map((campaign) => <CampaignCard key={campaign.address} campaign={campaign} snapshotTime={snapshotTime} />)}
      </DashboardSection>
    </div>
  );
}

function DashboardSection({
  title,
  count,
  children,
  headingRef,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section>
      <div className="mb-5 flex items-baseline gap-3">
        <h2 ref={headingRef} tabIndex={headingRef ? -1 : undefined} className="text-xl font-semibold text-white">{title}</h2>
        <span className="text-xs text-stone-400">{count}</span>
      </div>
      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-white/9 p-6 text-sm text-stone-400">Nothing to show.</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{children}</div>
      )}
    </section>
  );
}
