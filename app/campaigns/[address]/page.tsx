import { isAddress, type Address } from "viem";
import { notFound } from "next/navigation";
import { CampaignDetail } from "@/components/campaign-detail";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  if (!isAddress(address)) notFound();
  return <CampaignDetail address={address as Address} />;
}

