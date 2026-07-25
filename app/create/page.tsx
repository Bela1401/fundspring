import { CreateCampaignForm } from "@/components/create-campaign-form";

export const metadata = { title: "Create a campaign" };

export default function CreatePage() {
  return (
    <section className="shell py-14 md:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">New onchain campaign</p>
        <h1 className="font-editorial mt-4 text-5xl leading-tight text-white md:text-7xl">Start with clear terms.</h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-stone-400">
          Goal, deadline, beneficiary, and funding token are immutable after deployment.
          FundSpring allows overfunding and never takes a platform fee.
        </p>
        <div className="mt-9"><CreateCampaignForm /></div>
      </div>
    </section>
  );
}

