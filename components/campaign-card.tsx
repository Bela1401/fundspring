import Link from "next/link";
import { campaignStatuses, formatDeadline, formatUsdc, shorten } from "@/lib/format";
import type { CampaignSummary } from "@/lib/campaigns";
import {
  campaignPhaseLabels,
  getCampaignPhase,
} from "@/lib/campaign-discovery";
import { CampaignWatchButton } from "./campaign-watch-button";

export function CampaignCard({
  campaign,
  snapshotTime,
  onWatchToggle,
}: {
  campaign: CampaignSummary;
  snapshotTime?: bigint;
  onWatchToggle?: (watched: boolean) => void;
}) {
  const progress = Number(campaign.progressBps) / 100;
  const hasKnownStatus = campaign.status >= 0 && campaign.status <= 3;
  const phase = snapshotTime === undefined || !hasKnownStatus
    ? null
    : getCampaignPhase(campaign, snapshotTime);
  const statusLabel = phase
    ? campaignPhaseLabels[phase]
    : (campaignStatuses[campaign.status] ?? "Unknown");
  const statusClass = phase === "awaiting-finalization"
    ? "awaiting"
    : campaign.status;
  return (
    <article className="campaign-card-shell group relative h-full">
      <Link
        href={`/campaigns/${campaign.address}`}
        className="campaign-card block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-200/70"
      >
        {campaign.metadata?.image && (
          // External campaign media is validated as HTTPS metadata and intentionally remains unoptimized.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={campaign.metadata.image}
            alt=""
            className="mb-5 h-40 w-full rounded-xl object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="flex items-start justify-between gap-4 pr-11">
          <span className={`status status-${statusClass}`}>
            {statusLabel}
          </span>
          <span className="text-xs text-stone-400">{shorten(campaign.address)}</span>
        </div>
        <div className={campaign.metadata?.image ? "mt-5" : "mt-8"}>
          <h3 className="break-words text-2xl font-semibold tracking-tight text-white transition group-hover:text-lime-200">
            {campaign.title}
          </h3>
          <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-stone-400">
            {campaign.metadata?.description ?? "Onchain campaign with HTTPS metadata."}
          </p>
        </div>
        <div className="mt-8">
          <div className="mb-2 flex items-end justify-between">
            <p className="text-lg font-semibold text-white">
              {formatUsdc(campaign.totalRaised)} <span className="text-xs text-stone-400">USDC</span>
            </p>
            <p className="text-xs text-stone-400">{progress.toFixed(1)}%</p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="mt-4 flex justify-between text-xs text-stone-400">
            <span>Goal {formatUsdc(campaign.fundingGoal)} USDC</span>
            <span>{formatDeadline(campaign.deadline)}</span>
          </div>
        </div>
      </Link>
      <CampaignWatchButton
        address={campaign.address}
        title={campaign.title}
        compact
        className="absolute right-5 top-5 z-10"
        onToggle={onWatchToggle}
      />
    </article>
  );
}
