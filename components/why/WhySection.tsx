"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { MessageCircle, UserCheck, Inbox, MonitorSmartphone } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

/* Scroll-reveal wrapper: an element that fades/slides up as it enters the viewport. */
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
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
    icon: MessageCircle,
    kicker: "Live",
    title: "Messages show up as they're sent",
    body: "New messages appear in the chat without reloading the page, and you can see when the other person is typing.",
  },
  {
    icon: UserCheck,
    kicker: "People",
    title: "You decide who can reach you",
    body: "Someone has to send you a connection request, and you accept or decline it. You can block people, and you choose which notifications you get.",
  },
  {
    icon: Inbox,
    kicker: "Focus",
    title: "No feed, no timeline",
    body: "BadrLink has no feed of posts or updates from other people. Its lists are your chats, your connections and your notifications.",
  },
  {
    icon: MonitorSmartphone,
    kicker: "Devices",
    title: "Use it on your phone or laptop",
    body: "It runs in the browser, so you sign in the same way everywhere and your chats are already there.",
  },
];

const STEPS = [
  {
    label: "Create an account.",
    detail: "You need an email address, a username and a password.",
  },
  {
    label: "Add people.",
    detail: "Search for a username and send a connection request. Once they accept, you can message them.",
  },
  {
    label: "Start chatting.",
    detail: "Open a direct chat, or make a group and add the people in it.",
  },
];

const CARD_SHADOW = "[box-shadow:0_20px_44px_-32px_rgba(20,46,25,0.5)]";

/**
 * One reason. The surface is a `SpotlightCard`, so the lit border follows the
 * pointer across the card, and nothing at all happens while the pointer is elsewhere.
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

/**
 * The Why content: eyebrow, heading and intro, the four reasons, and the steps panel.
 * Rendered by the /why page (where its heading is the h1) and by the home page (where
 * the hero keeps the h1 and this heading is an h2).
 */
export function WhySection({
  headingLevel = "h2",
  headingId,
}: {
  headingLevel?: "h1" | "h2";
  headingId?: string;
}) {
  const Heading = headingLevel;

  return (
    <>
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
          {/* Focusable only when it has an id, i.e. when the home page links to it. */}
          <Heading id={headingId} tabIndex={headingId ? -1 : undefined} className="mt-4 font-display text-[clamp(2.4rem,5vw,3.5rem)] font-semibold leading-[1.06] tracking-[-0.01em] text-[var(--color-forest)]">
            A simple messaging app
          </Heading>
          <p className="mt-5 max-w-[38rem] font-body text-[18px] leading-[1.65] text-[var(--color-text-on-light-soft)]">
            BadrLink is for talking with people you already know, one on one or in groups. You send a connection
            request, and when it is accepted you have a chat with that person.
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
              How it works
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
    </>
  );
}
