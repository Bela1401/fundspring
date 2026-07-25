export default function Loading() {
  return (
    <section className="shell py-16" aria-label="Loading FundSpring">
      <div className="skeleton h-20" />
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="skeleton h-80" />
        <div className="skeleton h-80" />
      </div>
    </section>
  );
}
