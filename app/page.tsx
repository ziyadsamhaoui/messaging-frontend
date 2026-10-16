"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { buttonClasses } from "@/components/ui/Button";
import { CursorGrid } from "@/components/ui/CursorGrid";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { cn } from "@/lib/utils";

type BubbleSide = "left" | "right";
type BubbleTone = "own" | "theirs";

/* Chat bubble style: solid fill color with a small triangular tail (no gradient, no rounded-rect look) */
const BUBBLE_SURFACE: Record<BubbleTone, string> = {
  own:
    "[background-color:var(--color-parchment-elevated)] border border-[rgba(164,190,123,0.32)] text-[var(--color-forest)]",
  theirs:
    "[background-color:var(--color-forest-deep)] border border-[rgba(40,84,48,0.16)] text-[var(--color-parchment-elevated)]",
};

/*
 * The bubble body: an 8px rounded rectangle with 6px/10px padding, only as wide as
 * its text and never wider than 70% of the thread, so the longer lines wrap instead
 * of stretching the stack. The shadow is a `drop-shadow` filter rather than a
 * `box-shadow`, which is what lets it wrap the tail below as well.
 */
const BUBBLE_SHAPE =
  "relative w-fit max-w-[70%] rounded-[8px] px-2.5 py-1.5 font-body text-[13px] leading-snug " +
  "sm:text-[15px] drop-shadow-[0_2px_4px_rgba(20,46,25,0.28)]";

/*
 * The "pinched" tail: an 8x13 triangle pinned to the top corner on the sender's
 * side. `bg-inherit` fills it with the bubble's own background, so bubble and tail
 * read as one continuous shape, and `::before` keeps it out of the markup.
 */
const BUBBLE_TAIL: Record<BubbleSide, string> = {
  left:
    "before:absolute before:top-0 before:-left-2 before:h-[13px] before:w-2 before:bg-inherit before:content-[''] " +
    "before:[clip-path:polygon(0_0,100%_0,100%_100%)]",
  right:
    "before:absolute before:top-0 before:-right-2 before:h-[13px] before:w-2 before:bg-inherit before:content-[''] " +
    "before:[clip-path:polygon(0_0,100%_0,0_100%)]",
};

/*
 * The conversation, in the order it was sent. Sides alternate, and the top corner on
 * the sender's side stays square (border-radius 0) so the tail continues it: a
 * left/incoming bubble is square top-left with its tail out to the left, a
 * right/outgoing one is square top-right with its tail out to the right.
 */
const MESSAGES: { side: BubbleSide; tone: BubbleTone; text: string }[] = [
  { side: "left", tone: "own", text: "A: You still up?" },
  { side: "right", tone: "theirs", text: "B: Yeah, can't sleep" },
  { side: "left", tone: "own", text: "A: Same... wanna talk for a bit?" },
  { side: "right", tone: "theirs", text: "B: Always, what's on your mind?" },
];

/** Gap between one bubble's entrance and the next. */
const STAGGER = 0.3;

function Bubble({
  side,
  tone,
  delay,
  children,
}: {
  side: BubbleSide;
  tone: BubbleTone;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className={cn(
        BUBBLE_SHAPE,
        BUBBLE_SURFACE[tone],
        BUBBLE_TAIL[side],
        side === "left" ? "self-start rounded-tl-none" : "self-end rounded-tr-none"
      )}
    >
      {children}
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
 * gutter the bubbles see (an 8px tail still clears the edge).
 *
 * From `sm` up it stops bleeding, centres itself and caps at 520px, which keeps the
 * thread reading as a conversation rather than letting the two sides drift apart on a
 * tablet. From `xl` up it sits next to the artwork and overlaps its edge a little, so
 * the two read as one cluster.
 */
function BubbleThread() {
  return (
    <div className="-mx-6 flex w-[calc(100%_+_3rem)] flex-col gap-2.5 px-3 sm:mx-auto sm:w-full sm:max-w-[520px] sm:px-6 xl:-ml-4 xl:mx-0 xl:w-[220px] xl:max-w-none xl:shrink-0 xl:px-0">
      {MESSAGES.map((message, index) => (
        <Bubble
          key={message.text}
          side={message.side}
          tone={message.tone}
          delay={0.2 + index * STAGGER}
        >
          {message.text}
        </Bubble>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--color-parchment)] text-[var(--color-forest)]">
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
              <Link
                href="/why"
                className={buttonClasses({
                  variant: "secondary",
                  tone: "light",
                  size: "lg",
                  className: "max-[479px]:w-full",
                })}
              >
                Why BadrLink?
              </Link>
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
            className="relative mx-auto flex w-full max-w-[820px] flex-col items-center gap-4 xl:flex-row xl:items-center xl:justify-center xl:gap-0"
          >
            <div className="relative w-full max-w-[min(620px,max(392px,calc(50vw-120px)))] px-0 sm:px-8 xl:max-w-[480px] xl:px-0">
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
    </div>
  );
}
