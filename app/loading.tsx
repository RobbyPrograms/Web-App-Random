export default function Loading() {
  return (
    <div className="mx-auto max-w-xl animate-pulse space-y-4 px-4 py-10" aria-hidden>
      <div className="h-8 w-40 rounded bg-white/10" />
      <div className="h-56 rounded-3xl bg-white/10" />
      <div className="h-14 rounded-full bg-white/10" />
    </div>
  );
}
