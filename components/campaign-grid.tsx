"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CampaignCard } from "./campaign-card";
import { DeploymentPending } from "./empty-state";
import { useCampaigns } from "@/hooks/use-campaigns";
import { factoryAddress } from "@/lib/arc";
import type { CampaignSummary } from "@/lib/campaigns";
import {
  countCampaignPhases,
  campaignPhaseLabels,
  discoverCampaigns,
  isCampaignSort,
  isCampaignStatusFilter,
  type CampaignSort,
  type CampaignStatusFilter,
} from "@/lib/campaign-discovery";

const statusLabels: Record<CampaignStatusFilter, string> = {
  all: "All campaigns",
  ...campaignPhaseLabels,
};

const sortLabels: Record<CampaignSort, string> = {
  "registry-order": "Registry order",
  "ending-soon": "Ending soon",
  "most-funded": "Most funded",
  progress: "Highest progress",
  "largest-goal": "Largest goal",
};

function CampaignDiscoveryView({
  campaigns,
  snapshotTime,
}: {
  campaigns: CampaignSummary[];
  snapshotTime: bigint;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const query = searchParams.get("q") ?? "";
  const [searchDraft, setSearchDraft] = useState({ sourceQuery: query, value: query });
  const searchValue =
    isSearchFocused || searchDraft.sourceQuery === query
      ? searchDraft.value
      : query;
  const rawStatus = searchParams.get("status");
  const rawSort = searchParams.get("sort");
  const status: CampaignStatusFilter = isCampaignStatusFilter(rawStatus)
    ? rawStatus
    : "all";
  const sort: CampaignSort = isCampaignSort(rawSort)
    ? rawSort
    : "registry-order";
  const visibleCampaigns = discoverCampaigns(campaigns, {
    query: searchValue,
    status,
    sort,
    nowSeconds: snapshotTime,
  });
  const counts = countCampaignPhases(campaigns, snapshotTime);
  const hasDiscoveryState =
    Boolean(searchValue) || searchParams.has("status") || searchParams.has("sort");

  function setParameter(
    name: "q" | "status" | "sort",
    value: string,
    defaultValue = "",
  ) {
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue) params.set("q", searchValue);
    else params.delete("q");
    if (!value || value === defaultValue) params.delete(name);
    else params.set(name, value);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  function clearDiscovery() {
    setSearchDraft({ sourceQuery: query, value: "" });
    router.replace(pathname, { scroll: false });
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }

  return (
    <div>
      <div className="panel mb-8 p-5 md:p-6">
        <dl className="grid grid-cols-2 gap-3 border-b border-white/8 pb-5 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <dt className="text-xs text-stone-400">Registry</dt>
            <dd className="mt-1 text-xl font-semibold text-white">{campaigns.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-400">Live</dt>
            <dd className="mt-1 text-xl font-semibold text-lime-200">{counts.live}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-400">Awaiting finalization</dt>
            <dd className="mt-1 text-xl font-semibold text-amber-200">
              {counts["awaiting-finalization"]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-stone-400">Successful</dt>
            <dd className="mt-1 text-xl font-semibold text-emerald-300">{counts.successful}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-400">Failed</dt>
            <dd className="mt-1 text-xl font-semibold text-orange-300">{counts.failed}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-400">Cancelled</dt>
            <dd className="mt-1 text-xl font-semibold text-rose-300">{counts.cancelled}</dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem_14rem_auto] lg:items-end">
          <div>
            <label className="label" htmlFor="campaign-search">
              Search campaigns
            </label>
            <input
              ref={searchRef}
              id="campaign-search"
              className="field"
              type="search"
              placeholder="Title, description, or address"
              value={searchValue}
              onFocus={() => {
                if (searchDraft.sourceQuery !== query) {
                  setSearchDraft({ sourceQuery: query, value: query });
                }
                setIsSearchFocused(true);
              }}
              onBlur={() => {
                setIsSearchFocused(false);
                setParameter("q", searchValue);
              }}
              onChange={(event) => {
                setSearchDraft({ sourceQuery: query, value: event.target.value });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="campaign-status">
              Campaign status
            </label>
            <select
              id="campaign-status"
              className="field"
              value={status}
              onChange={(event) => setParameter("status", event.target.value, "all")}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="campaign-sort">
              Sort campaigns
            </label>
            <select
              id="campaign-sort"
              className="field"
              value={sort}
              onChange={(event) => setParameter("sort", event.target.value, "registry-order")}
            >
              {Object.entries(sortLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="button-secondary min-h-11"
            disabled={!hasDiscoveryState}
            onClick={clearDiscovery}
          >
            Clear
          </button>
        </div>
        <p className="mt-4 text-xs text-stone-400" aria-live="polite">
          Showing {visibleCampaigns.length} of {campaigns.length} campaigns from
          the onchain registry.
        </p>
      </div>

      {visibleCampaigns.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.address}
              campaign={campaign}
              snapshotTime={snapshotTime}
            />
          ))}
        </div>
      ) : (
        <div className="panel p-10 text-center">
          <h3 className="text-xl font-semibold text-white">No campaigns match</h3>
          <p className="mt-2 text-stone-400">
            Try a different search or reset the discovery filters.
          </p>
          <button
            type="button"
            className="button-secondary mt-5"
            onClick={clearDiscovery}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

export function CampaignGrid({
  limit,
  discovery = false,
}: {
  limit?: number;
  discovery?: boolean;
}) {
  const { data, isLoading, isFetching, error, refetch } = useCampaigns();
  if (!factoryAddress) return <DeploymentPending />;
  if (isLoading) {
    return (
      <div
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading campaigns from Arc.</span>
        {[0, 1, 2].map((item) => <div className="skeleton h-80" key={item} />)}
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="panel p-8 text-center text-rose-200" role="alert">
        <p>Campaigns could not be loaded from Arc RPC.</p>
        <button
          type="button"
          className="button-secondary mt-5"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? "Retrying…" : "Retry campaigns"}
        </button>
      </div>
    );
  }
  const staleWarning = error ? (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between" role="status">
      <p>Showing the last completed Arc snapshot because the latest refresh failed.</p>
      <button type="button" className="button-secondary shrink-0" disabled={isFetching} onClick={() => void refetch()}>
        {isFetching ? "Retrying…" : "Retry refresh"}
      </button>
    </div>
  ) : null;
  const campaigns = limit ? data?.campaigns.slice(0, limit) : data?.campaigns;
  if (!campaigns?.length) {
    return (
      <div>
        {staleWarning}
        <div className="panel p-10 text-center">
          <h3 className="text-xl font-semibold text-white">The spring is ready</h3>
          <p className="mt-2 text-stone-400">
            No campaigns have been created through this factory yet.
          </p>
        </div>
      </div>
    );
  }

  if (discovery && data) {
    return (
      <div>
        {staleWarning}
        <CampaignDiscoveryView
          campaigns={campaigns}
          snapshotTime={data.timestamp}
        />
      </div>
    );
  }

  return (
    <div>
      {staleWarning}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.address}
            campaign={campaign}
            snapshotTime={data?.timestamp}
          />
        ))}
      </div>
    </div>
  );
}
