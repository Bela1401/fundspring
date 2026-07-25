import { DashboardView } from "@/components/dashboard-view";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <section className="shell py-14 md:py-20">
      <p className="eyebrow">Wallet workspace</p>
      <h1 className="font-editorial mt-4 text-5xl text-white md:text-7xl">Your FundSpring activity.</h1>
      <p className="mt-4 mb-10 max-w-2xl text-sm leading-6 text-stone-400">
        This testnet dashboard queries the configured factory and campaign event/state data.
        It does not rely on a centralized contributor database.
      </p>
      <DashboardView />
    </section>
  );
}

