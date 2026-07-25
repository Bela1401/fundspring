import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/8 py-10 text-sm text-stone-500">
      <div className="shell flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <p>© 2026 FundSpring. Experimental testnet software.</p>
        <div className="flex flex-wrap gap-5">
          <Link href="/campaigns">Campaigns</Link>
          <Link href="/create">Create</Link>
          <Link href="/dashboard">Dashboard</Link>
          <a href="https://docs.arc.io" target="_blank" rel="noreferrer">Arc docs</a>
          <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer">Explorer</a>
        </div>
      </div>
    </footer>
  );
}
