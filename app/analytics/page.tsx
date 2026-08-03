import { ProtocolAnalytics } from "@/components/protocol-analytics";

export const metadata = {
  title: "Protocol analytics",
  description: "A live onchain snapshot of the FundSpring campaign registry on Arc Testnet.",
};

export default function AnalyticsPage() {
  return (
    <section className="shell py-14 md:py-20">
      <p className="eyebrow">Protocol intelligence</p>
      <div className="mt-4 mb-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-end">
        <h1 className="font-editorial text-5xl tracking-tight text-white md:text-7xl">
          FundSpring, measured onchain.
        </h1>
        <p className="text-sm leading-6 text-stone-400">
          A transparent view of campaign capital, outcomes, and registry participation built from current FundingCampaign contract state on Arc Testnet.
        </p>
      </div>
      <ProtocolAnalytics />
    </section>
  );
}
