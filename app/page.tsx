"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { buttonClasses } from "@/components/ui/Button";
import { CursorGrid } from "@/components/ui/CursorGrid";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { Reveal, WhySection } from "@/components/why/WhySection";
import { cn } from "@/lib/utils";

type BubbleSide = "left" | "right";
type BubbleTone = "own" | "theirs";

const BUBBLE_SURFACE: Record<BubbleTone, string> = {
  own:
    "[background-color:var(--color-parchment-elevated)] [background-image:linear-gradient(150deg,rgba(255,255,255,0.72),rgba(255,255,255,0.12)_48%,rgba(68,88,54,0.08))] text-[var(--color-forest)] border border-white/70",
  theirs:
    "[background-color:var(--color-forest-deep)] [background-image:linear-gradient(150deg,rgba(255,255,255,0.34),rgba(255,255,255,0.06)_42%,rgba(8,25,14,0.24))] text-[var(--color-parchment-elevated)] border border-white/20",
};

const BUBBLE_SHAPE =
  "relative w-fit max-w-[70%] rounded-[13px] px-[13px] py-[10px] font-body text-[15px] leading-snug " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_19px_rgba(20,46,25,0.2)]";

const MESSAGES: { side: BubbleSide; tone: BubbleTone; text: string; wide?: boolean }[] = [
  { side: "left", tone: "own", text: "A: You still up?", wide: true },
  { side: "right", tone: "theirs", text: "B: Yeah, can't sleep", wide: true },
  { side: "left", tone: "own", text: "A: Same... wanna talk for a bit?" },
  { side: "right", tone: "theirs", text: "B: Always, what's on your mind?" },
];

/** Gap between one bubble's entrance and the next. */
const STAGGER = 0.45;

function Bubble({
  side,
  tone,
  delay,
  placement,
  wide,
  children,
}: {
  side: BubbleSide;
  tone: BubbleTone;
  delay: number;
  placement: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 1.3, delay, ease: [0.16, 1, 0.3, 1] }
      }
      className={cn(
        "flex w-fit",
        side === "left" ? "self-start" : "self-end",
        placement
      )}
    >
      <motion.div
        animate={reduceMotion ? { y: 0 } : { y: [0, -5, 0] }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: 5,
                delay: delay + 1.3,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
        className={cn(
          BUBBLE_SHAPE,
          BUBBLE_SURFACE[tone],
          side === "left" ? "rounded-tl-none mr-auto" : "rounded-tr-none ml-auto",
          wide && "max-w-none whitespace-nowrap",
          "will-change-transform"
        )}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * The thread itself: one flex column, each bubble to its own side, staggered in one
 * after another.
 *
 * On phones it runs full width. `-mx-6` cancels the page gutter the hero sits in and
 * the width is grown by the same 3rem, because a negative margin on its own would
 * only shift the stack: `w-full` is measured against the padded parent, so the two
 * together are what make the stack span the viewport. `px-3` is then the whole 12px
 * gutter the bubbles see.
 *
 * From `sm` up it stops bleeding, centres itself and caps at 520px, which keeps the
 * thread reading as a conversation rather than letting the two sides drift apart on a
 * tablet. From `xl` up the column stays in flow so the artwork keeps its position,
 * while the bubbles are placed around it: incoming on the artwork's left, outgoing on
 * its right, staggered as in the reference.
 */
const BUBBLE_PLACEMENT = [
  "xl:absolute xl:left-[-426px] xl:top-0",
  "xl:absolute xl:right-0 xl:top-[72px]",
  "xl:absolute xl:left-[-426px] xl:top-[170px]",
  "xl:absolute xl:right-0 xl:top-[262px]",
];

function BubbleThread() {
  return (
    <div className="-mx-6 flex w-[calc(100%_+_3rem)] flex-col gap-4 px-3 sm:mx-auto sm:w-full sm:max-w-[520px] sm:px-6 xl:-ml-4 xl:mx-0 xl:h-[202px] xl:w-[220px] xl:max-w-none xl:shrink-0 xl:gap-0 xl:px-0 xl:relative">
      {MESSAGES.map((message, index) => (
        <Bubble
          key={message.text}
          side={message.side}
          tone={message.tone}
          delay={0.2 + index * STAGGER}
          placement={BUBBLE_PLACEMENT[index]}
          wide={message.wide}
        >
          {message.text}
        </Bubble>
      ))}
    </div>
  );
}

/**
 * Progressive enhancement for the "Why BadrLink?" link. Without JavaScript the plain
 * `href="#why"` still jumps to the section. With it, the page scrolls smoothly (or
 * jumps under reduced motion), moves focus to the section heading without a second
 * scroll, and records `#why` in the URL.
 */
function scrollToWhy(event: React.MouseEvent<HTMLAnchorElement>) {
  const section = document.getElementById("why");
  const heading = document.getElementById("why-heading");
  if (!section || !heading) return;
  event.preventDefault();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  window.history.pushState(null, "", "#why");
  heading.focus({ preventScroll: true });
}

export default function Home() {
  return (
    <div id="top" className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--color-parchment)] text-[var(--color-forest)]">
      {/* A light wash instead of the old dark ramp: two soft pools of sage and deep parchment keep the parchment from reading as a flat fill. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_95%_at_80%_6%,rgba(164,190,123,0.38),transparent_58%),radial-gradient(90%_80%_at_4%_98%,rgba(212,200,158,0.85),transparent_60%)]"
      />
      <CursorGrid tone="light" />

      <SiteHeader />

      <main className="relative z-10 flex flex-1 items-center px-6 py-12 lg:py-16">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10">
          {/* Marked so the grid softens while the pointer is over the hero copy. */}
          <div data-cursor-grid-soften className="flex flex-col gap-6">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-display text-[clamp(2.75rem,3.9vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.01em] text-[var(--color-forest)] [text-wrap:balance]"
            >
              Where words feel closer.
              <span className="mt-1 block italic text-[var(--color-primary)]">
                And people do too.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.12 }}
              className="max-w-[34rem] font-body text-[18px] leading-[1.6] text-[var(--color-text-on-light-soft)] sm:text-[19px]"
            >
              A quiet place to talk with the people who matter, wherever they are. Send it, see it land, get on with your day.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.24 }}
              className="flex flex-wrap items-center gap-3 pt-1"
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
              <a
                href="#why"
                onClick={scrollToWhy}
                className={buttonClasses({
                  variant: "secondary",
                  tone: "light",
                  size: "lg",
                  className: "max-[479px]:w-full",
                })}
              >
                Why BadrLink?
              </a>
            </motion.div>
          </div>

          {/*
            The illustration and its thread: side by side from `xl` (the thread
            overlapping the artwork's edge), stacked underneath below that. The gutter
            now lives on the artwork rather than on this wrapper, so the thread can
            bleed past it on phones. Marked so the grid softens over both, since the
            artwork has transparent areas.
          */}
          <div
            data-cursor-grid-soften
            className="relative mx-auto flex w-full max-w-[820px] flex-col items-center gap-4 lg:translate-x-20 xl:flex-row xl:items-center xl:justify-center xl:gap-0"
          >
            <div className="relative w-full max-w-[min(620px,max(392px,calc(50vw-120px)))] px-0 sm:px-8 lg:translate-x-20 xl:max-w-[480px] xl:px-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.2 }}
              >
                <Image
                  src="/texting_image_new.png"
                  alt="Two people chatting on their phones"
                  width={620}
                  height={528}
                  priority
                  className="h-auto w-full drop-shadow-[0_18px_40px_rgba(40,84,48,0.22)]"
                />
              </motion.div>
            </div>

            <BubbleThread />
          </div>
        </div>
      </main>

      <section id="why" aria-labelledby="why-heading" className="relative z-10 px-6 py-14 lg:py-20">
        <div className="mx-auto w-full max-w-5xl">
          <WhySection headingLevel="h2" headingId="why-heading" />

          <Reveal>
            <div className="mt-14 flex flex-wrap items-center gap-3">
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
              <a
                href="#top"
                className={buttonClasses({
                  variant: "secondary",
                  tone: "light",
                  size: "lg",
                  className: "max-[479px]:w-full",
                })}
              >
                Back to top
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
