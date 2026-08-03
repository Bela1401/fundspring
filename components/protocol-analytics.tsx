"use client";

import Link from "next/link";
import type { Address } from "viem";
import { DeploymentPending } from "./empty-state";
import { useCampaigns } from "@/hooks/use-campaigns";
import { ARC_EXPLORER_URL, factoryAddress } from "@/lib/arc";
import { campaignStatuses, errorMessage, formatUsdc, shorten } from "@/lib/format";
import { campaignPhaseLabels, getCampaignPhase } from "@/lib/campaign-discovery";
import {
  buildProtocolAnalytics,
  formatBasisPoints,
  type ProtocolAnalytics as ProtocolAnalyticsSnapshot,
} from "@/lib/protocol-analytics";

export function ProtocolAnalytics() {
  const campaigns = useCampaigns();

  if (!factoryAddress) return <DeploymentPending />;
  if (campaigns.isLoading) return <AnalyticsSkeleton />;
  if (campaigns.error && !campaigns.data) {
    return (
      <div className="panel p-8 text-center" role="alert">
        <p className="eyebrow">Snapshot unavailable</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Protocol analytics could not be loaded
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-rose-100">
          Arc RPC error: {errorMessage(campaigns.error)}
        </p>
        <button
          type="button"
          className="button-secondary mt-6"
          disabled={campaigns.isFetching}
          onClick={() => void campaigns.refetch()}
        >
          {campaigns.isFetching ? "Retrying…" : "Retry onchain snapshot"}
        </button>
      </div>
    );
  }

  if (!campaigns.data) return <AnalyticsSkeleton />;
  const snapshot = buildProtocolAnalytics(
    campaigns.data.campaigns,
    campaigns.data.timestamp,
  );

  return (
    <div className="space-y-8">
      {campaigns.error && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between" role="status">
          <p>Showing the last completed Arc snapshot because the latest refresh failed.</p>
          <button type="button" className="button-secondary shrink-0" disabled={campaigns.isFetching} onClick={() => void campaigns.refetch()}>
            {campaigns.isFetching ? "Retrying…" : "Retry refresh"}
          </button>
        </div>
      )}
      <SnapshotDisclosure
        snapshot={snapshot}
        isRefreshing={campaigns.isFetching}
        factory={factoryAddress}
        blockNumber={campaigns.data.blockNumber}
      />

      <section aria-labelledby="capital-overview">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Capital overview</p>
            <h2 id="capital-overview" className="mt-2 text-2xl font-semibold text-white">
              Registry-wide funding
            </h2>
          </div>
          <button
            type="button"
            className="button-secondary"
            disabled={campaigns.isFetching}
            onClick={() => void campaigns.refetch()}
          >
            {campaigns.isFetching ? "Refreshing…" : "Refresh snapshot"}
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Gross USDC raised"
            value={`${formatUsdc(snapshot.totalRaised)} USDC`}
            detail="Sum of each campaign's totalRaised value"
          />
          <MetricCard
            label="Combined target"
            value={`${formatUsdc(snapshot.totalTarget)} USDC`}
            detail="Sum of onchain funding goals"
          />
          <MetricCard
            label="Funding / target"
            value={formatBasisPoints(snapshot.fundingCompletionBps)}
            detail="Gross raised ÷ target; can exceed 100%"
          />
          <MetricCard
            label="Finalized success"
            value={formatBasisPoints(snapshot.finalizedSuccessBps)}
            detail={`${snapshot.successfulCampaigns} successful of ${snapshot.finalizedOutcomeCount} successful or failed`}
          />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]" aria-labelledby="protocol-state">
        <div className="panel p-6 md:p-8">
          <p className="eyebrow">Operational state</p>
          <h2 id="protocol-state" className="mt-2 text-2xl font-semibold text-white">
            Campaign distribution
          </h2>
          <div className="mt-7 space-y-5">
            <DistributionRow label="Live" count={snapshot.liveCampaigns} total={snapshot.campaignCount} tone="bg-lime-300" />
            <DistributionRow label="Awaiting finalization" count={snapshot.needsFinalization} total={snapshot.campaignCount} tone="bg-amber-300" />
            <DistributionRow label="Successful" count={snapshot.successfulCampaigns} total={snapshot.campaignCount} tone="bg-emerald-400" />
            <DistributionRow label="Failed" count={snapshot.failedCampaigns} total={snapshot.campaignCount} tone="bg-orange-400" />
            <DistributionRow label="Cancelled" count={snapshot.cancelledCampaigns} total={snapshot.campaignCount} tone="bg-rose-400" />
            {snapshot.unknownCampaigns > 0 && (
              <DistributionRow label="Unknown contract status" count={snapshot.unknownCampaigns} total={snapshot.campaignCount} tone="bg-stone-400" />
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <MetricCard label="Campaigns" value={snapshot.campaignCount.toLocaleString("en-US")} detail="Registered by this factory" />
          <MetricCard label="Unique creators" value={snapshot.uniqueCreators.toLocaleString("en-US")} detail="Distinct creator addresses" />
          <MetricCard label="Unique beneficiaries" value={snapshot.uniqueBeneficiaries.toLocaleString("en-US")} detail="Distinct beneficiary addresses" />
        </div>
      </section>

      <TopCampaigns snapshot={snapshot} />
    </div>
  );
}

function SnapshotDisclosure({
  snapshot,
  isRefreshing,
  factory,
  blockNumber,
}: {
  snapshot: ProtocolAnalyticsSnapshot;
  isRefreshing: boolean;
  factory: Address;
  blockNumber: bigint;
}) {
  return (
    <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[.045] p-5 md:flex md:items-center md:justify-between md:gap-8">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-lime-100">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-40 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-300" />
          </span>
          {isRefreshing ? "Refreshing onchain snapshot" : "Latest onchain snapshot"}
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-stone-400">
          Computed in your browser from the CampaignFactory registry and each FundingCampaign state returned by Arc RPC. No contributor counts, revenue, or future outcomes are inferred.
        </p>
        <p className="mt-1 text-xs text-stone-400">
          Arc block #{blockNumber.toString()} · {new Date(Number(snapshot.evaluatedAt) * 1_000).toISOString()}
        </p>
      </div>
      <a
        href={`${ARC_EXPLORER_URL}/address/${factory}`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex shrink-0 text-xs font-semibold text-lime-200 hover:text-lime-100 md:mt-0"
      >
        Factory {shorten(factory)} ↗
      </a>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="panel min-w-0 p-5">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-stone-400">{label}</p>
      <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-stone-400">{detail}</p>
    </div>
  );
}

function DistributionRow({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: string;
}) {
  const percentage = total === 0 ? 0 : (count / total) * 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className="text-stone-300">{label}</span>
        <span className="font-semibold text-white">
          {count.toLocaleString("en-US")} <span className="font-normal text-stone-400">/ {total.toLocaleString("en-US")}</span>
        </span>
      </div>
      {total === 0 ? (
        <div className="h-2 rounded-full bg-white/6" aria-hidden="true" />
      ) : (
        <div
          className="h-2 overflow-hidden rounded-full bg-white/6"
          role="progressbar"
          aria-label={`${label}: ${count} of ${total} campaigns`}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={count}
        >
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${percentage}%` }} />
        </div>
      )}
    </div>
  );
}

function TopCampaigns({ snapshot }: { snapshot: ProtocolAnalyticsSnapshot }) {
  return (
    <section className="panel overflow-hidden" aria-labelledby="top-campaigns">
      <div className="border-b border-white/8 p-6 md:flex md:items-end md:justify-between md:p-8">
        <div>
          <p className="eyebrow">Capital ranking</p>
          <h2 id="top-campaigns" className="mt-2 text-2xl font-semibold text-white">
            Top campaigns by gross USDC raised
          </h2>
        </div>
        <p className="mt-3 text-xs text-stone-400 md:mt-0">Up to five registry entries · no offchain ranking score</p>
      </div>
      {snapshot.topCampaigns.length === 0 ? (
        <div className="p-8 text-sm text-stone-400">No campaigns are registered yet.</div>
      ) : (
        <ol className="divide-y divide-white/8">
          {snapshot.topCampaigns.map((campaign, index) => {
            const hasKnownStatus = campaign.status >= 0 && campaign.status <= 3;
            const phase = hasKnownStatus
              ? getCampaignPhase(campaign, snapshot.evaluatedAt)
              : null;
            const statusLabel = phase
              ? campaignPhaseLabels[phase]
              : (campaignStatuses[campaign.status] ?? "Unknown");
            const statusClass = phase === "awaiting-finalization"
              ? "awaiting"
              : campaign.status;
            return <li key={campaign.address}>
              <Link
                href={`/campaigns/${campaign.address}`}
                className="grid gap-4 p-6 hover:bg-white/[.025] md:grid-cols-[2.5rem_minmax(0,1fr)_auto] md:items-center md:px-8"
              >
                <span className="text-sm font-semibold text-stone-400">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <h3 className="min-w-0 max-w-full truncate font-semibold text-white">{campaign.title}</h3>
                    <span className={`status status-${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-xs text-stone-400">
                    Goal {formatUsdc(campaign.fundingGoal)} USDC · {shorten(campaign.address)}
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="font-semibold text-lime-100">{formatUsdc(campaign.totalRaised)} USDC</p>
                  <p className="mt-1 text-xs text-stone-400">gross totalRaised</p>
                </div>
              </Link>
            </li>;
          })}
        </ol>
      )}
    </section>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-live="polite">
      <span className="sr-only">Loading protocol analytics from Arc.</span>
      <div className="skeleton h-24" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div className="skeleton h-36" key={item} />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <div className="skeleton h-96" />
        <div className="skeleton h-96" />
      </div>
    </div>
  );
}
