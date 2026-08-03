"use client";

import { explorerTx } from "@/lib/arc";

export type TransactionState =
  | { phase: "idle" }
  | { phase: "preparing"; message: string }
  | { phase: "signing"; message: string }
  | { phase: "submitted"; hash: `0x${string}`; message: string }
  | { phase: "final"; hash: `0x${string}`; message: string }
  | { phase: "error"; message: string };

export function TransactionStatus({ state }: { state: TransactionState }) {
  if (state.phase === "idle") return null;
  const tone = state.phase === "error" ? "border-rose-400/20 bg-rose-400/8 text-rose-100" : "border-lime-300/15 bg-lime-300/6 text-stone-200";
  return (
    <div className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${tone}`} role="status">
      <div className="flex items-center gap-2">
        {(state.phase === "preparing" || state.phase === "signing" || state.phase === "submitted") && (
          <span className="size-2 animate-pulse rounded-full bg-lime-300" />
        )}
        {state.message}
      </div>
      {"hash" in state && (
        <a
          className="mt-1 inline-block text-lime-200 underline-offset-4 hover:underline"
          href={explorerTx(state.hash)}
          target="_blank"
          rel="noreferrer"
        >
          {state.phase === "submitted"
            ? "Track submitted transaction on Arc explorer ↗"
            : "View final transaction on Arc explorer ↗"}
        </a>
      )}
    </div>
  );
}
