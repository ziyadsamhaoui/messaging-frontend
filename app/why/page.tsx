"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Clock, Lock, BellOff, MonitorSmartphone } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { CursorGrid } from "@/components/ui/CursorGrid";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

/* Scroll-reveal wrapper: an element that fades/slides up as it enters the viewport. */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

const REASONS = [
  {
    icon: Clock,
    kicker: "Real time",
    title: "Messages that just arrive",
    body: "Send it and it lands. No refresh, no spinner, no wondering whether it went through.",
  },
  {
    icon: Lock,
    kicker: "Private",
    title: "Nobody else is reading",
    body: "Your conversations belong to you and the people in them. Nothing is mined, nothing is sold on.",
  },
  {
    icon: BellOff,
    kicker: "No clutter",
    title: "Quiet by design",
    body: "No endless feed and no algorithm deciding what you should care about. Just your rooms and your people.",
  },
  {
    icon: MonitorSmartphone,
    kicker: "Every screen",
    title: "Pick up where you left off",
    body: "Start a thought on your phone and finish it on your laptop. The thread waits for you either way.",
  },
];

const STEPS = [
  { label: "Make an account", detail: "A username, an email, a password. That is the whole signup." },
  { label: "Find your people", detail: "Search for someone, send a request, and start a room when they accept." },
  { label: "Talk, and stop worrying", detail: "Everything is live, everything is saved, and nothing nags at you for attention." },
];

const CARD_SHADOW = "[box-shadow:0_20px_44px_-32px_rgba(20,46,25,0.5)]";

/**
 * One reason. The surface is a `SpotlightCard`, so the light and the lit border
 * follow the pointer across the card — no scaling, no lifting, and nothing at all
 * while the pointer is elsewhere.
 */
function ReasonCard({ reason, index }: { reason: (typeof REASONS)[number]; index: number }) {
  const Icon = reason.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 + index * 0.08 }}
    >
      <SpotlightCard
        className={`rounded-[var(--radius-surface)] border border-[rgba(40,84,48,0.14)] bg-[var(--color-parchment-elevated)] p-6 ${CARD_SHADOW}`}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-[rgba(59,99,48,0.1)] text-[var(--color-primary)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mt-5 font-ui text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fern-dark)]">
          {reason.kicker}
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--color-forest)]">
          {reason.title}
        </h2>
        <p className="mt-3 font-body text-[16px] leading-[1.6] text-[var(--color-text-on-light-soft)]">
          {reason.body}
        </p>
      </SpotlightCard>
    </motion.div>
  );
}

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
          <Reveal>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-2xl"
            >
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">
                Why BadrLink
              </p>
              <h1 className="mt-4 font-display text-[clamp(2.4rem,5vw,3.5rem)] font-semibold leading-[1.06] tracking-[-0.01em] text-[var(--color-forest)]">
                A calmer place to talk.
              </h1>
              <p className="mt-5 max-w-[38rem] font-body text-[18px] leading-[1.65] text-[var(--color-text-on-light-soft)]">
                Most messaging apps are built to hold your attention. This one is built to hand it back. It keeps the
                people you care about close and leaves the noise behind.
              </p>
            </motion.div>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {REASONS.map((reason, index) => (
              <Reveal key={reason.title} delay={index * 100}>
                <ReasonCard reason={reason} index={index} />
              </Reveal>
            ))}
          </div>

          <Reveal>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.42 }}
              className="mt-14"
            >
              {/* The steps panel is a card too, so it gets the same pointer response. */}
              <SpotlightCard
                as="section"
                className={`rounded-[var(--radius-surface)] border border-[rgba(40,84,48,0.18)] bg-[rgba(212,200,158,0.6)] p-7 sm:p-9 ${CARD_SHADOW}`}
              >
              <h2 className="font-display text-3xl font-semibold text-[var(--color-forest)]">
                Getting started takes a minute
              </h2>
              <ol className="mt-7 grid gap-6 sm:grid-cols-3">
                {STEPS.map((step, index) => (
                  <li key={step.label}>
                    <span className="font-ui text-sm font-semibold text-[var(--color-primary)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-1 font-ui text-[15px] font-semibold text-[var(--color-forest)]">{step.label}</p>
                    <p className="mt-2 font-body text-[15px] leading-[1.6] text-[var(--color-text-on-light-soft)]">
                      {step.detail}
                    </p>
                  </li>
                ))}
              </ol>
              </SpotlightCard>
            </motion.div>
          </Reveal>

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