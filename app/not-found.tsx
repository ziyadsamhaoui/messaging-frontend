import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md rounded-3xl border border-[var(--color-border)] bg-[rgba(26,58,32,0.85)] p-8 text-center">
        <h1 className="font-display text-2xl text-[var(--color-parchment)]">This path faded away</h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">The page you were looking for cannot be found.</p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-cta)] px-5 py-2.5 text-sm font-medium text-[var(--color-parchment)] transition hover:bg-[var(--color-cta-hover)]"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
