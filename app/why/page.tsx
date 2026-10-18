"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { buttonClasses } from "@/components/ui/Button";
import { CursorGrid } from "@/components/ui/CursorGrid";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { Reveal, WhySection } from "@/components/why/WhySection";

export default function WhyBadrLink() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--color-parchment)] text-[var(--color-forest)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_95%_at_82%_4%,rgba(164,190,123,0.38),transparent_58%),radial-gradient(90%_80%_at_4%_98%,rgba(212,200,158,0.85),transparent_60%)]"
      />
      <CursorGrid tone="light" />

      <SiteHeader />

      <main className="relative z-10 flex-1 px-6 py-14 lg:py-20">
        <div className="mx-auto w-full max-w-5xl">
          <WhySection headingLevel="h1" />

          <Reveal>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-14 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/login"
              className={buttonClasses({
                variant: "primary",
                tone: "light",
                size: "lg",
                className: "max-[479px]:w-full",
              })}
            >
              Get Started →
            </Link>
            <Link
              href="/"
              className={buttonClasses({
                variant: "secondary",
                tone: "light",
                size: "lg",
                className: "max-[479px]:w-full",
              })}
            >
              Back to home
            </Link>
          </motion.div>
          </Reveal>
        </div>
      </main>

      <footer className="relative z-10 px-6 pb-8">
        <div className="mx-auto w-full max-w-5xl border-t border-[rgba(40,84,48,0.18)] pt-5">
          <p className="font-ui text-xs text-[var(--color-text-on-light-soft)]">
            BadrLink. Real-time messaging, rooted in calm.
          </p>
        </div>
      </footer>
    </div>
  );
}
