"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { campaignAbi } from "@/lib/contracts";
import type { CampaignSummary } from "@/lib/campaigns";
import { errorMessage, formatUsdc } from "@/lib/format";
import { TransactionStatus, type TransactionState } from "./transaction-status";

export function CampaignActions({ campaign }: { campaign: CampaignSummary }) {
  const [transaction, setTransaction] = useState<TransactionState>({ phase: "idle" });
  const [now] = useState(() => BigInt(Math.floor(Date.now() / 1_000)));
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

  async function execute(functionName: "cancelCampaign" | "finalizeCampaign" | "claimFunds" | "claimRefund", label: string) {
    if (!client || chainId !== ARC_CHAIN_ID) {
      setTransaction({ phase: "error", message: "Connect on Arc Testnet first." });
      return;
    }
    try {
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
      setTransaction({ phase: "final", hash, message: `${label} is final on Arc.` });
      await Promise.all([
        reads.refetch(),
        queryClient.invalidateQueries({ queryKey: ["campaign", campaign.address] }),
        queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["activity", campaign.address] }),
      ]);
    } catch (error) {
      setTransaction({ phase: "error", message: errorMessage(error) });
    }
  }

  if (!address) return null;
  if (!canFinalize && !canCancel && !canClaim && !canRefund) {
    return contribution > 0n ? (
      <p className="mt-4 text-xs text-stone-500">Your recorded contribution: {formatUsdc(contribution)} USDC.</p>
    ) : null;
  }

  return (
    <div className="panel mt-5 p-5">
      <p className="label">Available wallet actions</p>
      <div className="grid gap-2">
        {canFinalize && <button className="button-secondary" onClick={() => void execute("finalizeCampaign", "Finalization")}>Finalize campaign</button>}
        {canCancel && <button className="button-secondary" onClick={() => void execute("cancelCampaign", "Cancellation")}>Cancel campaign</button>}
        {canClaim && <button className="button-primary" onClick={() => void execute("claimFunds", "Funds claim")}>Claim raised USDC</button>}
        {canRefund && <button className="button-primary" onClick={() => void execute("claimRefund", "Refund claim")}>Claim {formatUsdc(contribution)} USDC refund</button>}
      </div>
      <TransactionStatus state={transaction} />
    </div>
  );
}
