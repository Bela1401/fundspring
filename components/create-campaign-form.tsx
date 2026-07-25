"use client";

import { useMemo, useState, type FormEvent } from "react";
import { isAddress, parseEventLogs, parseUnits, type Address } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { ARC_CHAIN_ID, factoryAddress, explorerAddress } from "@/lib/arc";
import { factoryAbi } from "@/lib/contracts";
import { errorMessage } from "@/lib/format";
import { fetchCampaignMetadata, type CampaignMetadata } from "@/lib/metadata";
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
  const [openedAt] = useState(() => Date.now());
  const [transaction, setTransaction] = useState<TransactionState>({ phase: "idle" });
  const [campaignAddress, setCampaignAddress] = useState<`0x${string}`>();
  const [metadataPreview, setMetadataPreview] = useState<CampaignMetadata | null>();
  const [metadataChecking, setMetadataChecking] = useState(false);
  const { address, isConnected, chainId } = useAccount();
  const client = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const validation = useMemo(() => {
    if (!form.title.trim()) return "Add a campaign title.";
    if (form.title.trim().length > 120) return "Keep the title under 120 characters.";
    if (!/^https:\/\//.test(form.metadataURI) && !/^http:\/\/localhost/.test(form.metadataURI)) {
      return "Use an HTTPS metadata URL (localhost is allowed for development).";
    }
    if (!form.goal || Number(form.goal) <= 0) return "Set a positive USDC goal.";
    if (!form.deadline || new Date(form.deadline).getTime() < openedAt + 3_600_000) {
      return "The deadline must be at least one hour in the future.";
    }
    if (!isAddress(form.beneficiary)) return "Enter a valid beneficiary address.";
    return null;
  }, [form, openedAt]);

  async function checkMetadata(): Promise<CampaignMetadata | null> {
    if (!form.metadataURI) return null;
    setMetadataChecking(true);
    const metadata = await fetchCampaignMetadata(form.metadataURI.trim());
    setMetadataPreview(metadata);
    setMetadataChecking(false);
    return metadata;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!factoryAddress || !address || !client || validation) return;
    if (chainId !== ARC_CHAIN_ID) {
      setTransaction({ phase: "error", message: "Switch to Arc Testnet first." });
      return;
    }

    try {
      const metadata = await checkMetadata();
      if (!metadata) {
        setTransaction({
          phase: "error",
          message: "Metadata could not be loaded as valid HTTPS JSON. Check CORS, size, and description.",
        });
        return;
      }
      setTransaction({ phase: "signing", message: "Review campaign creation in your wallet." });
      const hash = await writeContractAsync({
        chainId: ARC_CHAIN_ID,
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "createCampaign",
        args: [
          form.title.trim(),
          form.metadataURI.trim(),
          parseUnits(form.goal, 6),
          BigInt(Math.floor(new Date(form.deadline).getTime() / 1_000)),
          form.beneficiary as Address,
        ],
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
      setTransaction({ phase: "final", hash, message: "Campaign created and final on Arc." });
    } catch (error) {
      setTransaction({ phase: "error", message: errorMessage(error) });
    }
  }

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

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
          <input className="field" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Community Solar Initiative" maxLength={120} />
        </label>
        <label className="md:col-span-2">
          <span className="label">Metadata URL</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className="field" type="url" value={form.metadataURI} onChange={(e) => { update("metadataURI", e.target.value); setMetadataPreview(undefined); }} placeholder="https://example.org/campaign.json" />
            <button className="button-secondary shrink-0" type="button" disabled={metadataChecking || !form.metadataURI} onClick={() => void checkMetadata()}>
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
          {metadataPreview === null && (
            <span className="mt-2 block text-xs text-rose-200">Metadata is unavailable or does not match the FundSpring schema.</span>
          )}
        </label>
        <label>
          <span className="label">Funding goal</span>
          <div className="relative">
            <input className="field pr-18" inputMode="decimal" value={form.goal} onChange={(e) => update("goal", e.target.value)} placeholder="10000" />
            <span className="absolute right-3 top-3.5 text-xs font-bold text-stone-500">USDC</span>
          </div>
        </label>
        <label>
          <span className="label">Deadline</span>
          <input className="field" type="datetime-local" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} />
        </label>
        <label className="md:col-span-2">
          <span className="label">Beneficiary address</span>
          <input className="field font-mono text-sm" value={form.beneficiary} onChange={(e) => update("beneficiary", e.target.value)} placeholder="0x…" />
        </label>
      </div>

      {validation && <p className="mt-5 text-xs text-amber-200">{validation}</p>}
      <button className="button-primary mt-6 w-full" disabled={!isConnected || Boolean(validation) || transaction.phase === "signing" || transaction.phase === "submitted"}>
        {!isConnected ? "Connect wallet to create" : "Create campaign on Arc Testnet"}
      </button>
      <p className="mt-3 text-center text-xs text-stone-500">Gas is paid in USDC. No ETH is required.</p>
      <TransactionStatus state={transaction} />
      {campaignAddress && (
        <a className="mt-4 block text-center text-sm text-lime-200" href={explorerAddress(campaignAddress)} target="_blank" rel="noreferrer">
          Open deployed FundingCampaign ↗
        </a>
      )}
    </form>
  );
}
