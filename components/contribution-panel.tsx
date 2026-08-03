"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  encodeFunctionData,
  formatEther,
  keccak256,
  parseEventLogs,
  parseUnits,
  type Hex,
  type Address,
  type TransactionReceipt,
} from "viem";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  ARC_CHAIN_ID,
  memoAddress,
  multicall3FromAddress,
  usdcAddress,
} from "@/lib/arc";
import {
  campaignAbi,
  memoAbi,
  multicall3FromAbi,
  usdcAbi,
} from "@/lib/contracts";
import { errorMessage, formatUsdc } from "@/lib/format";
import { parsePositiveUsdc } from "@/lib/form-validation";
import type { CampaignSummary } from "@/lib/campaigns";
import { contributionFeeEstimate } from "@/lib/contribution-fees";
import { buildContributionMemo } from "@/lib/contribution-reference";
import { TransactionStatus, type TransactionState } from "./transaction-status";
import { useQuery } from "@tanstack/react-query";
import { requestWalletConnection } from "@/lib/wallet-events";

type Mode = "standard" | "batch" | "memo";

function useQueryClientEoa(
  client: ReturnType<typeof usePublicClient>,
  address: Address | undefined,
) {
  return useQuery({
    queryKey: ["is-eoa", address],
    enabled: Boolean(client && address),
    queryFn: async () => {
      if (!client || !address) return undefined;
      const code = await client.getCode({ address });
      return !code || code === "0x";
    },
  });
}

function localReference(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 16)
      : Date.now().toString(36);
  return `FS-${random.toUpperCase()}`;
}

export function ContributionPanel({ campaign }: { campaign: CampaignSummary }) {
  const [amountInput, setAmountInput] = useState("");
  const [mode, setMode] = useState<Mode>("standard");
  const [reference, setReference] = useState(localReference);
  const [fee, setFee] = useState<bigint>();
  const [feeBreakdown, setFeeBreakdown] = useState<{ approval: bigint; action: bigint }>();
  const [feeNote, setFeeNote] = useState("");
  const [transaction, setTransaction] = useState<TransactionState>({ phase: "idle" });
  const submitLocked = useRef(false);
  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1_000)));
  const { address, isConnected, chainId } = useAccount();
  const client = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const normalizedAmountInput = amountInput.trim();
  const parsedAmount = useMemo(() => parsePositiveUsdc(normalizedAmountInput), [normalizedAmountInput]);
  const amount = parsedAmount ?? 0n;
  const amountInvalid = amountInput.trim().length > 0 && parsedAmount === null;
  const deadlinePassed = now >= campaign.deadline;
  const normalizedReference = reference.trim();
  const referenceValid = normalizedReference.length > 0 && normalizedReference.length <= 48;

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(BigInt(Math.floor(Date.now() / 1_000))),
      15_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const reads = useReadContracts({
    query: { enabled: Boolean(address) },
    contracts: address
      ? [
          {
            chainId: ARC_CHAIN_ID,
            address: usdcAddress,
            abi: usdcAbi,
            functionName: "allowance",
            args: [address, campaign.address],
          },
          {
            chainId: ARC_CHAIN_ID,
            address: usdcAddress,
            abi: usdcAbi,
            functionName: "balanceOf",
            args: [address],
          },
        ]
      : [],
  });
  const allowance = (reads.data?.[0]?.result as bigint | undefined) ?? 0n;
  const tokenBalance = (reads.data?.[1]?.result as bigint | undefined) ?? 0n;
  const needsApproval = amount > allowance;

  const eoaCheck = useQueryClientEoa(client, address);
  const isEoa = eoaCheck.data;
  const eoaCheckFailed = eoaCheck.isError;
  const eoaOnlyUnavailable = isEoa === false || eoaCheckFailed;
  const routeMode: Mode = eoaOnlyUnavailable ? "standard" : mode;

  const calls = useMemo(() => {
    const contributeData = encodeFunctionData({
      abi: campaignAbi,
      functionName: "contribute",
      args: [amount],
    });
    const approveData = encodeFunctionData({
      abi: usdcAbi,
      functionName: "approve",
      args: [campaign.address, amount],
    });
    return { contributeData, approveData };
  }, [amount, campaign.address]);

  const memoValues = useMemo(() => {
    if (!address || !referenceValid) return undefined;
    return buildContributionMemo(campaign.address, address, normalizedReference);
  }, [address, campaign.address, normalizedReference, referenceValid]);

  useEffect(() => {
    let cancelled = false;
    async function estimate() {
      if (!client || !address || amount === 0n || chainId !== ARC_CHAIN_ID) {
        setFee(undefined);
        setFeeBreakdown(undefined);
        setFeeNote(
          amountInvalid
            ? "Enter a positive USDC amount with no more than six decimal places."
            : !address
              ? "Connect a wallet to estimate the Arc fee."
              : chainId !== ARC_CHAIN_ID
                ? "Switch to Arc Testnet to estimate the fee."
                : "Enter an amount to estimate via Arc RPC.",
        );
        return;
      }
      if (routeMode === "memo" && !memoValues) {
        setFee(undefined);
        setFeeBreakdown(undefined);
        setFeeNote("Enter a non-empty contribution reference");
        return;
      }
      try {
        const gasPrice = await client.getGasPrice();
        let approvalGas = 0n;
        let actionGas: bigint;
        if (routeMode === "batch" && needsApproval) {
          actionGas = await client.estimateContractGas({
            account: address,
            address: multicall3FromAddress,
            abi: multicall3FromAbi,
            functionName: "aggregate3",
            args: [[
              { target: usdcAddress, allowFailure: false, callData: calls.approveData },
              { target: campaign.address, allowFailure: false, callData: calls.contributeData },
            ]],
          });
          setFeeNote("Atomic approve + contribute");
        } else if (routeMode === "memo" && memoValues && !needsApproval) {
          actionGas = await client.estimateContractGas({
            account: address,
            address: memoAddress,
            abi: memoAbi,
            functionName: "memo",
            args: [campaign.address, calls.contributeData, memoValues.memoId, memoValues.memoData],
          });
          setFeeNote("Memo contribution");
        } else if (needsApproval) {
          approvalGas = await client.estimateContractGas({
            account: address,
            address: usdcAddress,
            abi: usdcAbi,
            functionName: "approve",
            args: [campaign.address, amount],
          });
          actionGas = routeMode === "memo" ? 350_000n : 250_000n;
          setFeeNote("Approval via Arc RPC + conservative contribution allowance");
        } else {
          actionGas = await client.estimateContractGas({
            account: address,
            address: campaign.address,
            abi: campaignAbi,
            functionName: "contribute",
            args: [amount],
          });
          setFeeNote("Direct contribution");
        }
        const estimate = contributionFeeEstimate(approvalGas, actionGas, gasPrice);
        if (!cancelled) {
          setFee(estimate.total);
          setFeeBreakdown({ approval: estimate.approval, action: estimate.action });
        }
      } catch {
        if (!cancelled) {
          setFee(undefined);
          setFeeBreakdown(undefined);
          setFeeNote("Fee estimate unavailable until the call can be simulated");
        }
      }
    }
    void estimate();
    return () => { cancelled = true; };
  }, [address, amount, amountInvalid, calls, campaign.address, chainId, client, memoValues, needsApproval, routeMode]);

  async function waitFinal(hash: Hex, message: string): Promise<TransactionReceipt> {
    if (!client) throw new Error("Arc RPC is unavailable.");
    setTransaction({ phase: "submitted", hash, message });
    const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1 });
    if (receipt.status !== "success") throw new Error("The Arc transaction reverted.");
    return receipt;
  }

  function verifyContribution(receipt: TransactionReceipt, requireMemo = false) {
    if (!address) throw new Error("Wallet disconnected.");
    const contributions = parseEventLogs({
      abi: campaignAbi,
      eventName: "ContributionReceived",
      logs: receipt.logs,
      strict: false,
    });
    const transfers = parseEventLogs({
      abi: usdcAbi,
      eventName: "Transfer",
      logs: receipt.logs,
      strict: false,
    });
    const hasContribution = contributions.some(
      (event) =>
        event.address.toLowerCase() === campaign.address.toLowerCase() &&
        event.args.contributor?.toLowerCase() === address.toLowerCase() &&
        event.args.amount === amount,
    );
    const hasTransfer = transfers.some(
      (event) =>
        event.address.toLowerCase() === usdcAddress.toLowerCase() &&
        event.args.from?.toLowerCase() === address.toLowerCase() &&
        event.args.to?.toLowerCase() === campaign.address.toLowerCase() &&
        event.args.value === amount,
    );
    if (!hasContribution || !hasTransfer) {
      throw new Error("Final receipt did not contain the expected contribution and USDC events.");
    }
    if (requireMemo && memoValues) {
      const memos = parseEventLogs({ abi: memoAbi, eventName: "Memo", logs: receipt.logs, strict: false });
      const hasMemo = memos.some(
        (event) =>
          event.address.toLowerCase() === memoAddress.toLowerCase() &&
          event.args.sender?.toLowerCase() === address.toLowerCase() &&
          event.args.target?.toLowerCase() === campaign.address.toLowerCase() &&
          event.args.memoId === memoValues.memoId &&
          event.args.callDataHash === keccak256(calls.contributeData),
      );
      if (!hasMemo) throw new Error("Final receipt did not contain the expected Arc Memo event.");
    }
  }

  async function approveIfNeeded() {
    if (!needsApproval) return;
    if (BigInt(Math.floor(Date.now() / 1_000)) >= campaign.deadline) {
      throw new Error("The campaign deadline passed before approval could be submitted.");
    }
    setTransaction({ phase: "signing", message: "Approve the campaign to transfer this USDC amount." });
    const hash = await writeContractAsync({
      chainId: ARC_CHAIN_ID,
      address: usdcAddress,
      abi: usdcAbi,
      functionName: "approve",
      args: [campaign.address, amount],
    });
    await waitFinal(hash, "Approval submitted. Waiting for Arc’s final receipt…");
    await reads.refetch();
  }

  async function ensureActionBalance(action: "contribute" | "memo") {
    if (!client || !address) throw new Error("Arc RPC is unavailable.");
    const gasPrice = await client.getGasPrice();
    const gas =
      action === "memo" && memoValues
        ? await client.estimateContractGas({
            account: address,
            address: memoAddress,
            abi: memoAbi,
            functionName: "memo",
            args: [campaign.address, calls.contributeData, memoValues.memoId, memoValues.memoData],
          })
        : await client.estimateContractGas({
            account: address,
            address: campaign.address,
            abi: campaignAbi,
            functionName: "contribute",
            args: [amount],
          });
    const required = parseUnits(normalizedAmountInput, 18) + gas * gasPrice;
    if ((await client.getBalance({ address })) < required) {
      throw new Error("Add more USDC: the remaining balance cannot cover the contribution and its Arc fee.");
    }
  }

  async function ensureBatchBalance() {
    if (!client || !address) throw new Error("Arc RPC is unavailable.");
    const gasPrice = await client.getGasPrice();
    const gas = await client.estimateContractGas({
      account: address,
      address: multicall3FromAddress,
      abi: multicall3FromAbi,
      functionName: "aggregate3",
      args: [[
        { target: usdcAddress, allowFailure: false, callData: calls.approveData },
        { target: campaign.address, allowFailure: false, callData: calls.contributeData },
      ]],
    });
    const required = parseUnits(normalizedAmountInput, 18) + gas * gasPrice;
    if ((await client.getBalance({ address })) < required) {
      throw new Error(
        "Add more USDC: the wallet must cover both the contribution and the estimated Arc fee.",
      );
    }
  }

  async function contribute() {
    if (!client || !address || amount === 0n || submitLocked.current) return;
    submitLocked.current = true;
    if (chainId !== ARC_CHAIN_ID) {
      setTransaction({ phase: "error", message: "Switch to Arc Testnet first." });
      submitLocked.current = false;
      return;
    }
    try {
      let finalState: Extract<TransactionState, { phase: "final" }> | undefined;
      setTransaction({ phase: "preparing", message: "Checking the campaign, Arc fee, and your USDC balance…" });
      if (
        campaign.status !== 0 ||
        BigInt(Math.floor(Date.now() / 1_000)) >= campaign.deadline
      ) {
        throw new Error("This campaign is no longer accepting contributions.");
      }
      if (tokenBalance < amount) {
        throw new Error("Your USDC balance is lower than the contribution amount.");
      }
      if (routeMode !== "standard" && isEoa === undefined) {
        throw new Error("Wallet compatibility is still being checked. Try again in a moment.");
      }
      if (routeMode === "memo" && !memoValues) {
        throw new Error("Enter a non-empty contribution reference before continuing.");
      }
      if (fee) {
        const nativeBalance = await client.getBalance({ address });
        const contributionAtNativePrecision = parseUnits(normalizedAmountInput, 18);
        if (nativeBalance < contributionAtNativePrecision + fee) {
          throw new Error(
            "Add more USDC: the wallet must cover both the contribution and the estimated Arc fee.",
          );
        }
      }
      if (routeMode === "batch" && needsApproval) {
        if (!isEoa) throw new Error("Batching is limited to direct EOA wallets. Use the standard flow.");
        await ensureBatchBalance();
        setTransaction({ phase: "signing", message: "Review the atomic approve + contribute batch." });
        const hash = await writeContractAsync({
          chainId: ARC_CHAIN_ID,
          address: multicall3FromAddress,
          abi: multicall3FromAbi,
          functionName: "aggregate3",
          args: [[
            { target: usdcAddress, allowFailure: false, callData: calls.approveData },
            { target: campaign.address, allowFailure: false, callData: calls.contributeData },
          ]],
        });
        const receipt = await waitFinal(hash, "Batch submitted. Waiting for Arc’s final receipt…");
        verifyContribution(receipt);
        finalState = { phase: "final", hash, message: "Atomic approval and contribution are final on Arc." };
      } else if (routeMode === "memo") {
        if (!isEoa) throw new Error("Transaction memos require a direct EOA wallet. Use the standard flow.");
        await approveIfNeeded();
        if (!memoValues) throw new Error("Memo reference could not be generated.");
        await ensureActionBalance("memo");
        setTransaction({ phase: "signing", message: "Review the referenced contribution in your wallet." });
        const hash = await writeContractAsync({
          chainId: ARC_CHAIN_ID,
          address: memoAddress,
          abi: memoAbi,
          functionName: "memo",
          args: [campaign.address, calls.contributeData, memoValues.memoId, memoValues.memoData],
        });
        const receipt = await waitFinal(hash, "Memo contribution submitted. Waiting for Arc’s final receipt…");
        verifyContribution(receipt, true);
        finalState = { phase: "final", hash, message: `Contribution ${reference} is final and reconciled.` };
      } else {
        await approveIfNeeded();
        await ensureActionBalance("contribute");
        setTransaction({ phase: "signing", message: "Review the contribution in your wallet." });
        const hash = await writeContractAsync({
          chainId: ARC_CHAIN_ID,
          address: campaign.address,
          abi: campaignAbi,
          functionName: "contribute",
          args: [amount],
        });
        const receipt = await waitFinal(hash, "Contribution submitted. Waiting for Arc’s final receipt…");
        verifyContribution(receipt);
        finalState = { phase: "final", hash, message: "Contribution is final on Arc." };
      }
      await Promise.all([
        reads.refetch(),
        queryClient.invalidateQueries({ queryKey: ["campaign", campaign.address] }),
        queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["activity", campaign.address] }),
      ]);
      setAmountInput("");
      setFee(undefined);
      if (routeMode === "memo") setReference(localReference());
      if (!finalState) throw new Error("The final contribution state could not be reconciled.");
      setTransaction(finalState);
    } catch (error) {
      setTransaction({ phase: "error", message: errorMessage(error) });
    } finally {
      submitLocked.current = false;
    }
  }

  const busy = transaction.phase === "preparing" || transaction.phase === "signing" || transaction.phase === "submitted";
  const checkingEoa = Boolean(address && routeMode !== "standard" && isEoa === undefined);
  const contributionUnavailable = campaign.status !== 0 || deadlinePassed;

  return (
    <div className="panel p-5 md:p-6">
      <p className="eyebrow">Contribute</p>
      <div className="relative mt-4">
        <input
          className="field pr-20 text-lg"
          inputMode="decimal"
          value={amountInput}
          disabled={busy}
          onChange={(event) => setAmountInput(event.target.value)}
          placeholder="0.00"
          aria-label="Contribution amount in USDC"
          aria-invalid={amountInvalid}
          aria-describedby={amountInvalid ? "contribution-amount-error" : undefined}
        />
        <span className="absolute right-4 top-4 text-xs font-bold text-stone-500">USDC</span>
      </div>
      {amountInvalid && (
        <p id="contribution-amount-error" className="mt-2 text-xs text-rose-200" role="alert">
          Enter a positive USDC amount with no more than six decimal places.
        </p>
      )}
      <div className="mt-2 flex justify-between text-xs text-stone-500">
        <span>Wallet balance {formatUsdc(tokenBalance)} USDC</span>
        <span>{needsApproval ? "Approval required" : "Allowance ready"}</span>
      </div>

      <fieldset className="mt-5 grid gap-2">
        <legend className="label">Contribution route</legend>
        {([
          ["standard", "Standard", "Maximum wallet compatibility"],
          ["batch", "One transaction", "Atomic approve + contribute when needed"],
          ["memo", "With reference", "Arc Memo audit reference"],
        ] as const).map(([value, label, detail]) => (
          <label key={value} className={`flex items-center gap-3 rounded-xl border p-3 ${routeMode === value ? "border-lime-300/35 bg-lime-300/6" : "border-white/8"}`}>
            <input
              type="radio"
              name="route"
              checked={routeMode === value}
              disabled={busy || (value !== "standard" && eoaOnlyUnavailable)}
              onChange={() => setMode(value)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white">{label}</span>
              <span className="block text-xs text-stone-500">{detail}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {routeMode === "memo" && (
        <label className="mt-4 block">
          <span className="label">Local contribution reference</span>
          <input className="field font-mono text-sm" value={reference} disabled={busy} onChange={(event) => setReference(event.target.value.slice(0, 48))} />
          <span className="help">Memo ID = keccak256(ABI(campaign, contributor, reference)). The reference is public.</span>
          {!referenceValid && (
            <span className="mt-2 block text-xs text-rose-200">Enter at least one non-space character.</span>
          )}
        </label>
      )}

      {isEoa === false && (
        <p className="mt-4 rounded-lg bg-amber-300/8 p-3 text-xs leading-5 text-amber-100">
          This address has contract code, so Arc Memo and Multicall3From are disabled conservatively.
          Standard approve + contribute remains available.
        </p>
      )}
      {eoaCheckFailed && (
        <div className="mt-4 rounded-lg bg-amber-300/8 p-3 text-xs leading-5 text-amber-100" role="alert">
          <p>Wallet compatibility could not be verified, so Arc Memo and Multicall3From are disabled. The standard route remains available.</p>
          <button
            type="button"
            className="button-secondary mt-3"
            disabled={eoaCheck.isFetching}
            onClick={() => void eoaCheck.refetch()}
          >
            {eoaCheck.isFetching ? "Retrying…" : "Retry wallet compatibility"}
          </button>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-white/8 p-3 text-xs text-stone-400">
        <div className="flex justify-between">
          <span>Estimated Arc fee</span>
          <span className="text-white">{fee === undefined ? "Unavailable" : `${Number(formatEther(fee)).toFixed(6)} USDC`}</span>
        </div>
        <p className="mt-1 text-[11px] text-stone-600">{feeNote || "Enter an amount to estimate via Arc RPC."}</p>
        {feeBreakdown && feeBreakdown.approval > 0n && (
          <p className="mt-1 text-[11px] text-stone-600">
            Approval {Number(formatEther(feeBreakdown.approval)).toFixed(6)} + action{" "}
            {Number(formatEther(feeBreakdown.action)).toFixed(6)} USDC
          </p>
        )}
      </div>

      {!isConnected ? (
        <button
          type="button"
          className="button-primary mt-5 w-full"
          onClick={requestWalletConnection}
        >
          Connect wallet to contribute
        </button>
      ) : (
        <button
          type="button"
          className="button-primary mt-5 w-full"
          disabled={
            amount === 0n ||
            busy ||
            contributionUnavailable ||
            checkingEoa ||
            (routeMode === "memo" && !referenceValid)
          }
          onClick={() => void contribute()}
        >
          {contributionUnavailable
            ? "Campaign deadline passed"
            : checkingEoa
              ? "Checking wallet compatibility…"
              : busy
                ? "Transaction in progress…"
                : "Contribute USDC"}
        </button>
      )}
      <p className="mt-3 text-center text-xs text-stone-500">Arc fees are paid in USDC. ETH is not required.</p>
      <TransactionStatus state={transaction} />
    </div>
  );
}
