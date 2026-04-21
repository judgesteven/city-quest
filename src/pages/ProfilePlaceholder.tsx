import { BottomNav } from '../components/BottomNav';

export function ProfilePlaceholder() {
  return (
    <main className="relative flex h-full w-full items-center justify-center bg-cq-bg px-6">
      <section className="frosted-card w-full max-w-sm rounded-card p-6 text-center">
        <h1 className="text-xl font-semibold text-cq-ink">More</h1>
        <p className="mt-2 text-sm text-cq-muted">Settings and extras will be grouped here.</p>
      </section>
      <BottomNav current="more" />
    </main>
  );
}
