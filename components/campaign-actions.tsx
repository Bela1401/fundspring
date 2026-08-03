"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { campaignAbi } from "@/lib/contracts";
import type { CampaignSummary } from "@/lib/campaigns";
import { contributionFeeEstimate } from "@/lib/contribution-fees";
import { errorMessage, formatUsdc } from "@/lib/format";
import { TransactionStatus, type TransactionState } from "./transaction-status";

type LifecycleAction = "cancelCampaign" | "finalizeCampaign" | "claimFunds" | "claimRefund";

const lifecycleLabels: Record<LifecycleAction, string> = {
  cancelCampaign: "Cancellation",
  finalizeCampaign: "Finalization",
  claimFunds: "Funds claim",
  claimRefund: "Refund claim",
};

function formatArcFee(fee: bigint): string {
  return Number(formatEther(fee)).toLocaleString("en-US", {
    maximumFractionDigits: 6,
  });
}

export function CampaignActions({ campaign }: { campaign: CampaignSummary }) {
  const [transaction, setTransaction] = useState<TransactionState>({ phase: "idle" });
  const actionLocked = useRef(false);
  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1_000)));
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const reads = useReadContracts({
    query: { enabled: Boolean(address) },
    contracts: address
      ? [
          {
            chainId: ARC_CHAIN_ID,
            address: campaign.address,
            abi: campaignAbi,
            functionName: "contributionOf",
            args: [address],
          },
          {
            chainId: ARC_CHAIN_ID,
            address: campaign.address,
            abi: campaignAbi,
            functionName: "canClaimRefund",
            args: [address],
          },
        ]
      : [],
  });
  const contribution = (reads.data?.[0]?.result as bigint | undefined) ?? 0n;
  const canRefund = (reads.data?.[1]?.result as boolean | undefined) ?? false;
  const isCreator = address?.toLowerCase() === campaign.creator.toLowerCase();
  const isBeneficiary = address?.toLowerCase() === campaign.beneficiary.toLowerCase();
  const canFinalize = campaign.status === 0 && now >= campaign.deadline;
  const canCancel = campaign.status === 0 && isCreator;
  const canClaim = campaign.status === 1 && campaign.amountClaimed === 0n && isBeneficiary;
  const availableActions = useMemo(() => {
    const actions: LifecycleAction[] = [];
    if (canFinalize) actions.push("finalizeCampaign");
    if (canCancel) actions.push("cancelCampaign");
    if (canClaim) actions.push("claimFunds");
    if (canRefund) actions.push("claimRefund");
    return actions;
  }, [canCancel, canClaim, canFinalize, canRefund]);
  const busy = transaction.phase === "preparing" || transaction.phase === "signing" || transaction.phase === "submitted";

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(BigInt(Math.floor(Date.now() / 1_000))),
      15_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  async function estimateActionFee(functionName: LifecycleAction): Promise<bigint> {
    if (!client || !address) throw new Error("Arc RPC is unavailable.");
    const [gasPrice, gas] = await Promise.all([
      client.getGasPrice(),
      client.estimateContractGas({
        account: address,
        address: campaign.address,
        abi: campaignAbi,
        functionName,
      }),
    ]);
    return contributionFeeEstimate(0n, gas, gasPrice).total;
  }

  const feeEstimates = useQuery({
    queryKey: ["campaign-action-fees", campaign.address, address, availableActions],
    enabled: Boolean(
      client &&
      address &&
      chainId === ARC_CHAIN_ID &&
      availableActions.length > 0,
    ),
    queryFn: async () => {
      const entries = await Promise.all(
        availableActions.map(async (functionName) => (
          [functionName, await estimateActionFee(functionName)] as const
        )),
      );
      return Object.fromEntries(entries) as Partial<Record<LifecycleAction, bigint>>;
    },
    staleTime: 15_000,
    retry: 1,
  });

  async function execute(functionName: LifecycleAction, label: string) {
    if (actionLocked.current) return;
    actionLocked.current = true;
    if (!client || !address || chainId !== ARC_CHAIN_ID) {
      setTransaction({ phase: "error", message: "Connect on Arc Testnet first." });
      actionLocked.current = false;
      return;
    }
    try {
      setTransaction({ phase: "preparing", message: "Estimating the Arc fee and checking your USDC gas balance…" });
      const [estimatedFee, nativeBalance] = await Promise.all([
        estimateActionFee(functionName),
        client.getBalance({ address }),
      ]);
      if (nativeBalance < estimatedFee) {
        throw new Error(
          `Add more USDC before continuing. This action needs an estimated ${formatArcFee(estimatedFee)} USDC Arc fee.`,
        );
      }
      setTransaction({ phase: "signing", message: `Review ${label.toLowerCase()} in your wallet.` });
      const hash = await writeContractAsync({
        chainId: ARC_CHAIN_ID,
        address: campaign.address,
        abi: campaignAbi,
        functionName,
      });
      setTransaction({ phase: "submitted", hash, message: "Submitted. Waiting for Arc’s final receipt…" });
      const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1 });
      if (receipt.status !== "success") throw new Error(`${label} reverted.`);
      await Promise.all([
        reads.refetch(),
        queryClient.invalidateQueries({ queryKey: ["campaign", campaign.address] }),
        queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["activity", campaign.address] }),
        queryClient.invalidateQueries({ queryKey: ["campaign-action-fees", campaign.address] }),
      ]);
      setTransaction({ phase: "final", hash, message: `${label} is final on Arc.` });
    } catch (error) {
      setTransaction({ phase: "error", message: errorMessage(error) });
    } finally {
      actionLocked.current = false;
    }
  }

  if (!address) return null;
  if (availableActions.length === 0) {
    if (reads.isError) {
      return (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/8 p-4 text-xs text-rose-100" role="alert">
          <p>Wallet-specific campaign actions could not be loaded: {errorMessage(reads.error)}</p>
          <button type="button" className="button-secondary mt-3" disabled={reads.isFetching} onClick={() => void reads.refetch()}>
            {reads.isFetching ? "Retrying…" : "Retry wallet actions"}
          </button>
        </div>
      );
    }
    return contribution > 0n ? (
      <p className="mt-4 text-xs text-stone-500">Your recorded contribution: {formatUsdc(contribution)} USDC.</p>
    ) : null;
  }

  return (
    <div className="panel mt-5 p-5">
      <p className="label">Available wallet actions</p>
      <div className="mb-4 rounded-xl border border-white/8 p-3 text-xs text-stone-400" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <span>Estimated Arc gas</span>
          {feeEstimates.isFetching && <span>Refreshing…</span>}
        </div>
        {chainId !== ARC_CHAIN_ID ? (
          <p className="mt-2 text-amber-100">Switch to Arc Testnet to estimate fees.</p>
        ) : feeEstimates.isError ? (
          <div className="mt-2" role="alert">
            <p className="text-rose-100">Fee estimate unavailable: {errorMessage(feeEstimates.error)}</p>
            <button type="button" className="button-secondary mt-3" disabled={feeEstimates.isFetching} onClick={() => void feeEstimates.refetch()}>
              Retry fee estimate
            </button>
          </div>
        ) : feeEstimates.data ? (
          <div className="mt-2 grid gap-1">
            {availableActions.map((functionName) => (
              <div key={functionName} className="flex justify-between gap-4">
                <span>{lifecycleLabels[functionName]}</span>
                <span className="text-white">
                  {feeEstimates.data?.[functionName] === undefined
                    ? "Unavailable"
                    : `${formatArcFee(feeEstimates.data[functionName])} USDC`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2">Estimating via the current Arc RPC…</p>
        )}
        <p className="mt-2 text-[11px] text-stone-600">Arc transaction fees are paid in USDC; ETH is not required.</p>
      </div>
      {reads.isError && (
        <div className="mb-4 rounded-xl bg-rose-400/8 p-3 text-xs text-rose-100" role="alert">
          <p>Refund eligibility could not be refreshed: {errorMessage(reads.error)}</p>
          <button type="button" className="button-secondary mt-3" disabled={reads.isFetching} onClick={() => void reads.refetch()}>
            {reads.isFetching ? "Retrying…" : "Retry wallet actions"}
          </button>
        </div>
      )}
      <div className="grid gap-2">
        {canFinalize && <button type="button" className="button-secondary" disabled={busy} onClick={() => void execute("finalizeCampaign", "Finalization")}>Finalize campaign</button>}
        {canCancel && <button type="button" className="button-secondary" disabled={busy} onClick={() => void execute("cancelCampaign", "Cancellation")}>Cancel campaign</button>}
        {canClaim && <button type="button" className="button-primary" disabled={busy} onClick={() => void execute("claimFunds", "Funds claim")}>Claim raised USDC</button>}
        {canRefund && <button type="button" className="button-primary" disabled={busy} onClick={() => void execute("claimRefund", "Refund claim")}>Claim {formatUsdc(contribution)} USDC refund</button>}
      </div>
      <TransactionStatus state={transaction} />
    </div>
  );
}
