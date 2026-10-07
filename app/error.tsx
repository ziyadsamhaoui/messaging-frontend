"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md rounded-3xl border border-[var(--color-border)] bg-[rgba(26,58,32,0.85)] p-8 text-center">
        <h1 className="font-display text-2xl text-[var(--color-parchment)]">Something went wrong</h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{error.message}</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[rgba(164,190,123,0.1)]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
