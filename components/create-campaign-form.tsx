"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatEther, parseEventLogs, type Address } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { ARC_CHAIN_ID, factoryAddress, explorerAddress } from "@/lib/arc";
import { factoryAbi } from "@/lib/contracts";
import { errorMessage } from "@/lib/format";
import {
  CAMPAIGN_SUBMISSION_SAFETY_MARGIN_MS,
  hasMinimumCampaignLeadTime,
  isNonZeroAddress,
  parsePositiveUsdc,
} from "@/lib/form-validation";
import { fetchCampaignMetadata, type CampaignMetadata } from "@/lib/metadata";
import { requestWalletConnection } from "@/lib/wallet-events";
import { TransactionStatus, type TransactionState } from "./transaction-status";

interface FormData {
  title: string;
  metadataURI: string;
  goal: string;
  deadline: string;
  beneficiary: string;
}

const initialForm: FormData = {
  title: "",
  metadataURI: "",
  goal: "",
  deadline: "",
  beneficiary: "",
};

export function CreateCampaignForm() {
  const [form, setForm] = useState(initialForm);
  const [now, setNow] = useState(() => Date.now());
  const [transaction, setTransaction] = useState<TransactionState>({ phase: "idle" });
  const [campaignAddress, setCampaignAddress] = useState<`0x${string}`>();
  const [metadataPreview, setMetadataPreview] = useState<CampaignMetadata | null>();
  const [metadataError, setMetadataError] = useState<string>();
  const [metadataChecking, setMetadataChecking] = useState(false);
  const [feeEstimate, setFeeEstimate] = useState<bigint>();
  const [feeEstimating, setFeeEstimating] = useState(false);
  const [feeNote, setFeeNote] = useState("Connect a wallet and complete the form to estimate the Arc fee.");
  const submitLocked = useRef(false);
  const { address, isConnected, chainId } = useAccount();
  const client = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const goalAmount = useMemo(() => parsePositiveUsdc(form.goal), [form.goal]);
  const creationArgs = useMemo(
    () => [
      form.title.trim(),
      form.metadataURI.trim(),
      goalAmount ?? 0n,
      BigInt(Math.floor(new Date(form.deadline).getTime() / 1_000) || 0),
      form.beneficiary as Address,
    ] as const,
    [form.beneficiary, form.deadline, form.metadataURI, form.title, goalAmount],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const validation = useMemo(() => {
    if (!form.title.trim()) return "Add a campaign title.";
    if (form.title.trim().length > 120) return "Keep the title under 120 characters.";
    if (!/^https:\/\//.test(form.metadataURI) && !/^http:\/\/localhost/.test(form.metadataURI)) {
      return "Use an HTTPS metadata URL (localhost is allowed for development).";
    }
    if (goalAmount === null) return "Set a positive USDC goal with at most 6 decimal places.";
    if (
      !hasMinimumCampaignLeadTime(
        form.deadline,
        now,
        CAMPAIGN_SUBMISSION_SAFETY_MARGIN_MS,
      )
    ) {
      return "The deadline must be at least one hour and one minute in the future.";
    }
    if (!isNonZeroAddress(form.beneficiary)) {
      return "Enter a valid non-zero beneficiary address.";
    }
    return null;
  }, [form, goalAmount, now]);

  const estimateCreationFee = useCallback(async () => {
    if (!client || !address || !factoryAddress) {
      throw new Error("Arc RPC or wallet account is unavailable.");
    }
    const [gas, gasPrice] = await Promise.all([
      client.estimateContractGas({
        account: address,
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "createCampaign",
        args: creationArgs,
      }),
      client.getGasPrice(),
    ]);
    return gas * gasPrice;
  }, [address, client, creationArgs]);
  const canEstimateCreation = Boolean(
    isConnected && chainId === ARC_CHAIN_ID && !validation && client && address,
  );
  const unavailableFeeNote = !isConnected
    ? "Connect a wallet and complete the form to estimate the Arc fee."
    : chainId !== ARC_CHAIN_ID
      ? "Switch to Arc Testnet to estimate the fee."
      : "Complete the form to estimate the fee through the Arc RPC.";

  useEffect(() => {
    let cancelled = false;
    if (!canEstimateCreation) return;

    async function refreshFeeEstimate() {
      setFeeEstimate(undefined);
      setFeeEstimating(true);
      setFeeNote("Estimating through the current Arc RPC…");
      try {
        const estimate = await estimateCreationFee();
        if (!cancelled) {
          setFeeEstimate(estimate);
          setFeeNote("Current Arc RPC estimate. Your wallet shows the final fee before signing.");
        }
      } catch {
        if (!cancelled) {
          setFeeEstimate(undefined);
          setFeeNote("Fee estimate is unavailable until the campaign call can be simulated.");
        }
      } finally {
        if (!cancelled) setFeeEstimating(false);
      }
    }

    void refreshFeeEstimate();

    return () => {
      cancelled = true;
    };
  }, [canEstimateCreation, estimateCreationFee]);

  async function checkMetadata(): Promise<CampaignMetadata | null> {
    if (!form.metadataURI) return null;
    setMetadataChecking(true);
    setMetadataError(undefined);
    try {
      const metadata = await fetchCampaignMetadata(form.metadataURI.trim());
      setMetadataPreview(metadata);
      if (!metadata) {
        setMetadataError(
          "Metadata is unavailable or does not match the FundSpring schema.",
        );
      }
      return metadata;
    } catch (error) {
      setMetadataPreview(null);
      setMetadataError(errorMessage(error));
      return null;
    } finally {
      setMetadataChecking(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !factoryAddress ||
      !address ||
      !client ||
      validation ||
      goalAmount === null ||
      campaignAddress ||
      submitLocked.current
    ) return;
    if (chainId !== ARC_CHAIN_ID) {
      setTransaction({ phase: "error", message: "Switch to Arc Testnet first." });
      return;
    }

    submitLocked.current = true;
    setTransaction({ phase: "preparing", message: "Validating metadata, estimating the Arc fee, and checking your USDC gas balance…" });
    try {
      const metadata = await checkMetadata();
      if (!metadata) {
        throw new Error(
          "Metadata could not be loaded as valid HTTPS JSON. Check CORS, size, and description.",
        );
      }

      const currentFee = await estimateCreationFee();
      setFeeEstimate(currentFee);
      const nativeUsdcBalance = await client.getBalance({ address });
      if (nativeUsdcBalance < currentFee) {
        throw new Error(
          `Add more USDC for gas: this creation is currently estimated at ${Number(formatEther(currentFee)).toFixed(6)} USDC.`,
        );
      }
      if (
        !hasMinimumCampaignLeadTime(
          form.deadline,
          Date.now(),
          CAMPAIGN_SUBMISSION_SAFETY_MARGIN_MS,
        )
      ) {
        throw new Error(
          "The deadline is now too close. Keep at least one hour and one minute before creation.",
        );
      }

      setTransaction({ phase: "signing", message: "Review campaign creation in your wallet." });
      const hash = await writeContractAsync({
        chainId: ARC_CHAIN_ID,
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "createCampaign",
        args: creationArgs,
      });
      setTransaction({ phase: "submitted", hash, message: "Submitted. Waiting for Arc’s final receipt…" });
      const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1 });
      if (receipt.status !== "success") throw new Error("Campaign creation reverted.");

      const events = parseEventLogs({
        abi: factoryAbi,
        eventName: "CampaignCreated",
        logs: receipt.logs,
        strict: false,
      });
      const created = events[0]?.args.campaign;
      if (!created) throw new Error("CampaignCreated event was not found in the final receipt.");
      setCampaignAddress(created);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["campaign", created] }),
        queryClient.invalidateQueries({ queryKey: ["activity", created] }),
        queryClient.invalidateQueries({ queryKey: ["funded-campaigns"] }),
      ]);
      setTransaction({ phase: "final", hash, message: "Campaign created and final on Arc." });
    } catch (error) {
      submitLocked.current = false;
      setTransaction({ phase: "error", message: errorMessage(error) });
    }
  }

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const formBusy =
    transaction.phase === "preparing" ||
    transaction.phase === "signing" ||
    transaction.phase === "submitted";
  const controlsLocked = formBusy || metadataChecking || Boolean(campaignAddress);

  if (!factoryAddress) {
    return (
      <div className="panel p-8">
        <p className="text-amber-100">Campaign creation is disabled until a real factory address is configured.</p>
        <p className="mt-2 text-sm text-stone-500">Set <code>NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS</code> after deployment.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="panel p-6 md:p-9">
      <div className="grid gap-6 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="label">Campaign title</span>
          <input className="field" value={form.title} disabled={controlsLocked} onChange={(e) => update("title", e.target.value)} placeholder="Community Solar Initiative" maxLength={120} />
        </label>
        <label className="md:col-span-2">
          <span className="label">Metadata URL</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className="field" type="url" value={form.metadataURI} disabled={controlsLocked} onChange={(e) => { update("metadataURI", e.target.value); setMetadataPreview(undefined); setMetadataError(undefined); }} placeholder="https://example.org/campaign.json" />
            <button className="button-secondary shrink-0" type="button" disabled={controlsLocked || !form.metadataURI} onClick={() => void checkMetadata()}>
              {metadataChecking ? "Checking…" : "Validate metadata"}
            </button>
          </div>
          <span className="help">HTTPS JSON, at most 64 KB, with a 20–2,000 character description. Image and external URL must also use HTTPS.</span>
          {metadataPreview && (
            <span className="mt-3 block rounded-xl border border-lime-300/20 bg-lime-300/5 p-3 text-sm text-stone-300">
              <strong className="block text-white">{metadataPreview.name ?? form.title}</strong>
              <span className="mt-1 block text-xs leading-5">{metadataPreview.description}</span>
            </span>
          )}
          {metadataError && (
            <span className="mt-2 block text-xs text-rose-200" role="alert">
              {metadataError}
            </span>
          )}
        </label>
        <label>
          <span className="label">Funding goal</span>
          <div className="relative">
            <input className="field pr-18" inputMode="decimal" value={form.goal} disabled={controlsLocked} onChange={(e) => update("goal", e.target.value)} placeholder="10000" />
            <span className="absolute right-3 top-3.5 text-xs font-bold text-stone-500">USDC</span>
          </div>
        </label>
        <label>
          <span className="label">Deadline</span>
          <input className="field" type="datetime-local" value={form.deadline} disabled={controlsLocked} onChange={(e) => update("deadline", e.target.value)} />
        </label>
        <label className="md:col-span-2">
          <span className="label">Beneficiary address</span>
          <input className="field font-mono text-sm" value={form.beneficiary} disabled={controlsLocked} onChange={(e) => update("beneficiary", e.target.value)} placeholder="0x…" />
        </label>
      </div>

      {validation && <p className="mt-5 text-xs text-amber-200">{validation}</p>}
      <div className="mt-5 rounded-xl border border-white/8 p-3 text-xs text-stone-400">
        <div className="flex justify-between gap-4">
          <span>Estimated Arc fee</span>
          <span className="text-white">
            {canEstimateCreation && feeEstimating
              ? "Estimating…"
              : !canEstimateCreation || feeEstimate === undefined
                ? "Unavailable"
                : `${Number(formatEther(feeEstimate)).toFixed(6)} USDC`}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-stone-600">
          {canEstimateCreation ? feeNote : unavailableFeeNote}
        </p>
      </div>
      {!isConnected ? (
        <button
          type="button"
          className="button-primary mt-6 w-full"
          onClick={requestWalletConnection}
        >
          Connect wallet to create
        </button>
      ) : (
        <button
          type="submit"
          className="button-primary mt-6 w-full"
          disabled={
            Boolean(validation) ||
            formBusy ||
            Boolean(campaignAddress)
          }
        >
          {campaignAddress
            ? "Campaign created"
            : formBusy
              ? "Campaign creation in progress…"
              : "Create campaign on Arc Testnet"}
        </button>
      )}
      <p className="mt-3 text-center text-xs text-stone-500">Gas is paid in USDC. No ETH is required.</p>
      <TransactionStatus state={transaction} />
      {campaignAddress && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link className="button-primary text-center" href={`/campaigns/${campaignAddress}`}>
            Open campaign
          </Link>
          <a className="button-secondary text-center" href={explorerAddress(campaignAddress)} target="_blank" rel="noreferrer">
            View contract on explorer ↗
          </a>
        </div>
      )}
    </form>
  );
}
