import type { Metadata } from "next";

export const metadata: Metadata = { title: "Risk and privacy" };

export default function LegalPage() {
  return (
    <section className="shell py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Risk and privacy</p>
        <h1 className="font-editorial mt-5 text-5xl text-white md:text-7xl">Testnet software, transparent by design.</h1>
        <div className="mt-10 space-y-8 text-sm leading-7 text-stone-400">
          <section>
            <h2 className="text-xl font-semibold text-white">Experimental status</h2>
            <p className="mt-2">FundSpring runs on Arc Testnet and uses test assets. The contracts have not undergone a professional third-party security audit. Do not represent testnet balances as real money.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">Public blockchain data</h2>
            <p className="mt-2">Wallet addresses, contributions, campaign actions, transaction memos, and contribution references are public onchain data. Do not place personal or confidential information in metadata or memo references.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">No custody or endorsement</h2>
            <p className="mt-2">FundSpring does not custody funds or charge a platform fee. It is independently developed and is not an official Arc or Circle product. Arc, Circle App Kit, USDC, RPC providers, wallets, and the explorer are external dependencies.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">Browser data</h2>
            <p className="mt-2">The application does not maintain a centralized contributor database. Wallet state is handled by the selected wallet connector, and campaign views are derived from public contract state and event logs.</p>
          </section>
        </div>
      </div>
    </section>
  );
}
