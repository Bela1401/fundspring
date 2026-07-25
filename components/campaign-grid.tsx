"use client";

import { CampaignCard } from "./campaign-card";
import { DeploymentPending } from "./empty-state";
import { useCampaigns } from "@/hooks/use-campaigns";
import { factoryAddress } from "@/lib/arc";

export function CampaignGrid({ limit }: { limit?: number }) {
  const { data, isLoading, error } = useCampaigns();
  if (!factoryAddress) return <DeploymentPending />;
  if (isLoading) {
    return (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => <div className="skeleton h-80" key={item} />)}
      </div>
    );
  }
  if (error) {
    return <div className="panel p-8 text-rose-200">Campaigns could not be loaded from Arc RPC.</div>;
  }
  const campaigns = limit ? data?.slice(0, limit) : data;
  if (!campaigns?.length) {
    return (
      <div className="panel p-10 text-center">
        <h3 className="text-xl font-semibold text-white">The spring is ready</h3>
        <p className="mt-2 text-stone-400">No campaigns have been created through this factory yet.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => <CampaignCard key={campaign.address} campaign={campaign} />)}
    </div>
  );
}

