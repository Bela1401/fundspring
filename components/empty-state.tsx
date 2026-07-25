import Link from "next/link";

export function DeploymentPending() {
  return (
    <div className="panel border-dashed p-8 text-center">
      <p className="eyebrow">Deployment pending</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">No factory address configured</h2>
      <p className="mx-auto mt-3 max-w-xl text-stone-400">
        The application is ready for Arc Testnet deployment. Add the real deployed
        CampaignFactory address to <code>NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS</code> to
        enable live campaign discovery. No placeholder address is used.
      </p>
      <Link href="/create" className="button-secondary mt-6 inline-flex">Review creation flow</Link>
    </div>
  );
}

