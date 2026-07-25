"use client";

import type { Address } from "viem";
import { useCampaign } from "@/hooks/use-campaign";
import {
  campaignStatuses,
  formatDeadline,
  formatUsdc,
  shorten,
} from "@/lib/format";
import { explorerAddress } from "@/lib/arc";
import { ContributionPanel } from "./contribution-panel";
import { ActivityFeed } from "./activity-feed";
import { CampaignActions } from "./campaign-actions";
import { FundWalletPanel } from "./fund-wallet-panel";

export function CampaignDetail({ address }: { address: Address }) {
  const { data: campaign, isLoading, error } = useCampaign(address);
  if (isLoading) return <section className="shell py-16"><div className="skeleton h-[34rem]" /></section>;
  if (error || !campaign) {
    return <section className="shell py-16"><div className="panel p-8 text-rose-200">This address could not be read as a FundSpring campaign.</div></section>;
  }

  const progress = Number(campaign.progressBps) / 100;
  return (
    <section className="shell py-12 md:py-18">
      <div className="grid gap-9 lg:grid-cols-[1fr_23rem]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`status status-${campaign.status}`}>{campaignStatuses[campaign.status] ?? "Unknown"}</span>
            <a className="text-xs text-stone-500 hover:text-lime-200" href={explorerAddress(campaign.address)} target="_blank" rel="noreferrer">
              Contract {shorten(campaign.address)} ↗
            </a>
          </div>
          <h1 className="font-editorial mt-7 max-w-4xl text-5xl leading-[1.02] tracking-tight text-white md:text-7xl">
            {campaign.title}
          </h1>
          {campaign.metadata?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.metadata.image}
              alt=""
              className="mt-7 max-h-[30rem] w-full rounded-3xl border border-white/8 object-cover"
              referrerPolicy="no-referrer"
            />
          )}
          <p className="mt-6 max-w-3xl text-base leading-7 text-stone-400">
            {campaign.metadata?.description ?? "Campaign details are recorded in the linked metadata document."}
          </p>
          {campaign.metadata?.external_url && (
            <a className="mt-4 inline-block text-sm text-lime-200" href={campaign.metadata.external_url} target="_blank" rel="noreferrer">Campaign website ↗</a>
          )}

          <div className="mt-10 panel p-6 md:p-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-4xl font-semibold text-white">{formatUsdc(campaign.totalRaised)} <span className="text-sm text-stone-500">USDC</span></p>
                <p className="mt-1 text-sm text-stone-500">raised of {formatUsdc(campaign.fundingGoal)} USDC</p>
              </div>
              <p className="text-2xl font-semibold text-lime-200">{progress.toFixed(1)}%</p>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <div className="mt-7 grid gap-5 text-sm sm:grid-cols-2">
              <div><p className="text-xs text-stone-600">Deadline</p><p className="mt-1 text-stone-300">{formatDeadline(campaign.deadline)}</p></div>
              <div><p className="text-xs text-stone-600">Creator</p><a href={explorerAddress(campaign.creator)} target="_blank" rel="noreferrer" className="mt-1 block text-stone-300 hover:text-lime-200">{shorten(campaign.creator)} ↗</a></div>
              <div><p className="text-xs text-stone-600">Beneficiary</p><a href={explorerAddress(campaign.beneficiary)} target="_blank" rel="noreferrer" className="mt-1 block text-stone-300 hover:text-lime-200">{shorten(campaign.beneficiary)} ↗</a></div>
              <div><p className="text-xs text-stone-600">Settlement</p><p className="mt-1 text-stone-300">All-or-nothing · overfunding allowed</p></div>
            </div>
          </div>

          <div className="mt-10"><ActivityFeed campaign={campaign.address} /></div>
        </div>
        <aside>
          {campaign.status === 0 ? (
            <ContributionPanel campaign={campaign} />
          ) : (
            <div className="panel p-6 text-sm leading-6 text-stone-400">
              <p className="eyebrow">Campaign closed</p>
              <p className="mt-3">New contributions are unavailable because this campaign is {campaignStatuses[campaign.status]?.toLowerCase()}.</p>
            </div>
          )}
          <FundWalletPanel />
          <CampaignActions campaign={campaign} />
          <div className="mt-5 rounded-xl border border-white/7 p-4 text-xs leading-5 text-stone-600">
            Experimental Arc Testnet software. Contracts have not undergone a professional third-party security audit.
          </div>
        </aside>
      </div>
    </section>
  );
}
