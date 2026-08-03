import Link from "next/link";
import { CampaignGrid } from "@/components/campaign-grid";

export default function HomePage() {
  return (
    <>
      <section className="shell relative overflow-hidden py-20 md:py-30">
        <div className="absolute right-[-8rem] top-10 size-80 rounded-full border border-lime-200/10 bg-lime-200/4 blur-sm" />
        <div className="relative max-w-4xl">
          <p className="eyebrow">Independent crowdfunding · Built on Arc</p>
          <h1 className="font-editorial mt-7 text-6xl leading-[.94] font-medium tracking-[-.045em] text-white md:text-[7.6rem]">
            Give good ideas
            <span className="block text-lime-200 italic">room to rise.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-7 text-stone-400 md:text-lg">
            All-or-nothing USDC campaigns with transparent onchain settlement,
            pull-based refunds, optional transaction references, and Arc-native finality.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/campaigns" className="button-primary inline-flex">Explore campaigns</Link>
            <Link href="/create" className="button-secondary">Start a campaign</Link>
            <Link href="/analytics" className="button-secondary">View analytics</Link>
          </div>
        </div>
        <div className="mt-18 grid border-y border-white/8 py-7 text-sm sm:grid-cols-3">
          <div><p className="text-2xl font-semibold text-white">USDC</p><p className="mt-1 text-stone-500">Funding and gas</p></div>
          <div className="mt-5 sm:mt-0"><p className="text-2xl font-semibold text-white">&lt; 1 second</p><p className="mt-1 text-stone-500">Deterministic finality</p></div>
          <div className="mt-5 sm:mt-0"><p className="text-2xl font-semibold text-white">Pull based</p><p className="mt-1 text-stone-500">Contributor-controlled refunds</p></div>
        </div>
      </section>

      <section className="shell pb-24">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow">Live registry</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Campaigns taking root</h2>
          </div>
          <Link href="/campaigns" className="hidden text-sm text-lime-200 sm:block">View all →</Link>
        </div>
        <CampaignGrid limit={3} />
      </section>

      <section className="shell pb-24">
        <div className="panel grid gap-10 p-7 md:grid-cols-[1.1fr_.9fr] md:p-12">
          <div>
            <p className="eyebrow">How settlement works</p>
            <h2 className="font-editorial mt-4 text-4xl leading-tight text-white md:text-5xl">
              Clear rules before the first contribution.
            </h2>
          </div>
          <ol className="space-y-5 text-sm text-stone-400">
            <li><span className="mr-3 text-lime-200">01</span>Creators set a fixed USDC goal, deadline, and beneficiary.</li>
            <li><span className="mr-3 text-lime-200">02</span>Contributors deposit official Arc Testnet USDC into the campaign.</li>
            <li><span className="mr-3 text-lime-200">03</span>Anyone finalizes after the deadline; success unlocks the beneficiary claim.</li>
            <li><span className="mr-3 text-lime-200">04</span>Failed or cancelled campaigns let each contributor pull their own refund.</li>
          </ol>
        </div>
      </section>
    </>
  );
}
