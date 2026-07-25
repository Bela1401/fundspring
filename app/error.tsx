"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="shell py-24">
      <div className="panel mx-auto max-w-xl p-8 text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">The onchain view could not be loaded.</h1>
        <p className="mt-4 text-sm leading-6 text-stone-400">
          Your funds and contract state are unaffected. Retry the Arc RPC request or open the explorer.
        </p>
        <button className="button-primary mt-6" onClick={reset}>Try again</button>
      </div>
    </section>
  );
}
