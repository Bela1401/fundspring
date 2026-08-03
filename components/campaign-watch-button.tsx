"use client";

import type { Address } from "viem";
import { useWatchlist } from "@/hooks/use-watchlist";

export function CampaignWatchButton({
  address,
  title,
  compact = false,
  className = "",
  onToggle,
}: {
  address: Address;
  title: string;
  compact?: boolean;
  className?: string;
  onToggle?: (watched: boolean) => void;
}) {
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(address);
  const action = watched ? "Remove from saved campaigns" : "Save campaign";

  return (
    <button
      type="button"
      aria-pressed={watched}
      aria-label={`${action}: ${title}`}
      title={action}
      onClick={() => {
        toggle(address);
        onToggle?.(!watched);
      }}
      className={`${compact ? "inline-flex h-9 w-9 p-0" : "button-secondary"} items-center justify-center rounded-xl border border-white/12 bg-[#0d1a14]/90 text-stone-300 backdrop-blur transition hover:border-lime-200/40 hover:text-lime-200 ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill={watched ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 4.75A1.75 1.75 0 0 1 8.5 3h7a1.75 1.75 0 0 1 1.75 1.75V21L12 17.5 6.75 21V4.75Z" />
      </svg>
      {!compact && <span>{watched ? "Saved" : "Save campaign"}</span>}
    </button>
  );
}
