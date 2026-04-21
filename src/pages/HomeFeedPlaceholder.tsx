import { BottomNav } from '../components/BottomNav';

export function HomeFeedPlaceholder() {
  return (
    <main className="relative flex h-full w-full items-center justify-center bg-cq-bg px-6">
      <section className="frosted-card w-full max-w-sm rounded-card p-6 text-center">
        <h1 className="text-xl font-semibold text-cq-ink">Home</h1>
        <p className="mt-2 text-sm text-cq-muted">
          Feed view is not built yet. Open Map to explore Helsinki.
        </p>
      </section>
      <BottomNav current="home" />
    </main>
  );
}
