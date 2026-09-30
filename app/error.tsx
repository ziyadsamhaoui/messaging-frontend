"use client";

import React from "react";
import Link from "next/link";
import { Button } from "../components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md rounded-3xl border border-[var(--color-border)] bg-[rgba(26,58,32,0.85)] p-8 text-center">
        <h1 className="font-display text-2xl text-[var(--color-parchment)]">Something went wrong</h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{error.message}</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/frontend/public">
            <Button variant="ghost">Back to home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

