import Link from "next/link";

export default function NotFound() {
  return (
    <section className="shell py-28 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-editorial mt-4 text-6xl text-white">Nothing planted here.</h1>
      <Link href="/campaigns" className="button-primary mt-8 inline-flex">Explore campaigns</Link>
    </section>
  );
}

