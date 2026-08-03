import { Suspense } from "react";
import { CampaignGrid } from "@/components/campaign-grid";

export const metadata = { title: "Explore campaigns" };

export default function CampaignsPage() {
  return (
    <section className="shell py-16 md:py-22">
      <p className="eyebrow">Onchain campaign registry</p>
      <div className="mt-4 mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h1 className="font-editorial text-5xl tracking-tight text-white md:text-7xl">Explore what’s growing.</h1>
        <p className="max-w-md text-sm leading-6 text-stone-400">
          Every campaign below is loaded directly from the configured CampaignFactory
          on Arc Testnet. No synthetic activity or fake balances.
        </p>
      </div>
      <Suspense
        fallback={
          <div
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
            role="status"
            aria-live="polite"
          >
            <span className="sr-only">Loading campaign discovery.</span>
            <div className="skeleton h-80" />
            <div className="skeleton h-80" />
            <div className="skeleton h-80" />
          </div>
        }
      >
        <CampaignGrid discovery />
      </Suspense>
    </section>
  );
}
