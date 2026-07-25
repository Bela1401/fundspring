"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { CampaignCard } from "./campaign-card";
import { DeploymentPending } from "./empty-state";
import { useCampaigns } from "@/hooks/use-campaigns";
import { ARC_CHAIN_ID, factoryAddress } from "@/lib/arc";
import { campaignAbi } from "@/lib/contracts";
import type { CampaignSummary } from "@/lib/campaigns";
import { formatUsdc } from "@/lib/format";

interface FundedCampaign {
  campaign: CampaignSummary;
  contribution: bigint;
  canRefund: boolean;
}

export function DashboardView() {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: ARC_CHAIN_ID });
  const campaigns = useCampaigns();
  const funded = useQuery({
    queryKey: ["funded-campaigns", address, campaigns.data?.map((item) => item.address)],
    enabled: Boolean(client && address && campaigns.data),
    queryFn: async (): Promise<FundedCampaign[]> => {
      if (!client || !address || !campaigns.data) return [];
      const records = await Promise.all(
        campaigns.data.map(async (campaign) => {
          const [contribution, canRefund] = await client.multicall({
            allowFailure: false,
            contracts: [
              {
                address: campaign.address,
                abi: campaignAbi,
                functionName: "contributionOf",
                args: [address],
              },
              {
                address: campaign.address,
                abi: campaignAbi,
                functionName: "canClaimRefund",
                args: [address],
              },
            ],
          });
          return {
            campaign,
            contribution: contribution as bigint,
            canRefund: canRefund as boolean,
          };
        }),
      );
      return records.filter((record) => record.contribution > 0n);
    },
  });

  if (!factoryAddress) return <DeploymentPending />;
  if (!address) {
    return (
      <div className="panel p-10 text-center">
        <h2 className="text-2xl font-semibold text-white">Connect your wallet</h2>
        <p className="mt-2 text-stone-400">Your creator, contributor, refund, and beneficiary views are derived from the connected address.</p>
      </div>
    );
  }
  if (campaigns.isLoading || funded.isLoading) return <div className="skeleton h-96" />;

  const created = campaigns.data?.filter(
    (campaign) => campaign.creator.toLowerCase() === address.toLowerCase(),
  ) ?? [];
  const refunds = funded.data?.filter((record) => record.canRefund) ?? [];
  const claims = campaigns.data?.filter(
    (campaign) =>
      campaign.beneficiary.toLowerCase() === address.toLowerCase() &&
      campaign.status === 1 &&
      campaign.amountClaimed === 0n,
  ) ?? [];

  return (
    <div className="space-y-14">
      <DashboardSection title="Created by you" count={created.length}>
        {created.map((campaign) => <CampaignCard key={campaign.address} campaign={campaign} />)}
      </DashboardSection>
      <DashboardSection title="Funded by you" count={funded.data?.length ?? 0}>
        {funded.data?.map(({ campaign, contribution }) => (
          <div key={campaign.address}>
            <CampaignCard campaign={campaign} />
            <p className="-mt-12 px-6 pb-5 text-xs text-lime-200">Your contribution: {formatUsdc(contribution)} USDC</p>
          </div>
        ))}
      </DashboardSection>
      <DashboardSection title="Refunds available" count={refunds.length}>
        {refunds.map(({ campaign }) => <CampaignCard key={campaign.address} campaign={campaign} />)}
      </DashboardSection>
      <DashboardSection title="Beneficiary claims ready" count={claims.length}>
        {claims.map((campaign) => <CampaignCard key={campaign.address} campaign={campaign} />)}
      </DashboardSection>
    </div>
  );
}

function DashboardSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex items-baseline gap-3">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <span className="text-xs text-stone-600">{count}</span>
      </div>
      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-white/9 p-6 text-sm text-stone-600">Nothing to show.</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{children}</div>
      )}
    </section>
  );
}
