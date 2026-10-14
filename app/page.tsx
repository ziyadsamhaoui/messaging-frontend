"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { buttonClasses } from "@/components/ui/Button";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { cn } from "@/lib/utils";

type BubbleSide = "left" | "right";
type BubbleTone = "own" | "theirs";
type BubbleFloat = "float" | "float-slow" | "float-drift";

/*
 * Speech bubbles. Both tones are a solid colour under a soft diagonal sheen
 * with a small specular highlight in the top-left corner, finished with a
 * one-pixel top highlight and a shallow, faint shadow, so they read as small
 * pieces of paper rather than flat rectangles.
 *
 * The positioning wrapper and the floating element are deliberately separate:
 * the float keyframes animate `transform`, which would otherwise wipe out the
 * horizontal offset that hangs each bubble off the illustration's edge.
 *
 * Each arbitrary value stays inside one string literal: split across a
 * concatenation, the scanner never sees the complete class name and emits no
 * CSS for it.
 */
const BUBBLE_SURFACE: Record<BubbleTone, string> = {
  own:
    "[background-color:var(--color-surface-2)] [background-image:radial-gradient(120%_90%_at_10%_0%,rgba(255,255,255,0.08),transparent_58%),linear-gradient(158deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_46%,rgba(0,0,0,0.08))] border border-[rgba(164,190,123,0.32)] text-[var(--color-parchment-elevated)]",
  theirs:
    "[background-color:var(--color-parchment-elevated)] [background-image:radial-gradient(120%_90%_at_10%_0%,rgba(255,255,255,0.9),transparent_62%),linear-gradient(158deg,rgba(255,255,255,0.5),rgba(255,255,255,0.12)_50%,rgba(40,84,48,0.05))] border border-[rgba(40,84,48,0.16)] text-[var(--color-forest)]",
};

/* A faint two-layer drop shadow plus the one-pixel top highlight. */
const BUBBLE_SHAPE =
  "rounded-2xl px-4 py-3 font-body text-[13px] leading-snug sm:text-[15px] [box-shadow:0_10px_22px_-14px_rgba(20,46,25,0.34),0_2px_5px_-2px_rgba(20,46,25,0.14),inset_0_1px_0_rgba(255,255,255,0.45)]";

/** Named in full so the class names stay literal in the source. */
const FLOAT_ANIMATION: Record<BubbleFloat, string> = {
  float: "animate-float",
  "float-slow": "animate-float-slow",
  "float-drift": "animate-float-drift",
};

function Bubble({
  side,
  topClass,
  widthClass,
  tone,
  float,
  delay,
  visibilityClass,
  children,
}: {
  side: BubbleSide;
  /** Literal Tailwind utilities, so the scanner still sees them. */
  topClass: string;
  widthClass: string;
  tone: BubbleTone;
  float: BubbleFloat;
  delay: number;
  /** Lets a bubble drop out on the narrowest screens. */
  visibilityClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute",
        topClass,
        widthClass,
        visibilityClass,
        // Below 640px the bubbles sit inside the artwork's edges; above it they
        // hang 40% of their own width off each side. The cluster keeps its own
        // responsive sizes so it never reaches past the viewport.
        side === "left" ? "left-0 sm:-translate-x-[40%]" : "right-0 sm:translate-x-[40%]"
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay }}
      >
        <div className={cn(BUBBLE_SHAPE, BUBBLE_SURFACE[tone], FLOAT_ANIMATION[float])}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--color-parchment)] text-[var(--color-forest)]">
      {/* A light wash instead of the old dark ramp: two soft pools of sage and
          deep parchment keep the parchment from reading as a flat fill. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_95%_at_80%_6%,rgba(164,190,123,0.38),transparent_58%),radial-gradient(90%_80%_at_4%_98%,rgba(212,200,158,0.85),transparent_60%)]"
      />

      <SiteHeader />

      <main className="relative z-10 flex flex-1 items-center px-6 py-12 lg:py-16">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10">
          <div className="flex flex-col gap-6">
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
              A quiet place to talk with the people who matter, wherever they are. Send it, see it
              land, get on with your day.
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
            The illustration and its six bubbles share one wrapper. The wrapper
            keeps horizontal room so the bubbles can hang off the artwork's
            edges, and each bubble sits at a height its margin scan found free
            of faces.
          */}
          <div className="relative mx-auto w-full max-w-[820px] px-0 sm:px-8">
            {/* The bubbles anchor to this box, so its width is what drives both the
                artwork size and where each bubble hangs. */}
            {/* One range-based width instead of competing breakpoint widths: it
                holds the artwork at 392px while the column is narrow, then grows
                with the viewport to 620px, where the bubbles have the most room
                to hang off it. */}
            <div className="relative mx-auto w-full max-w-[min(620px,max(392px,calc(50vw-120px)))]">
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

              <Bubble
                side="left"
                topClass="top-0 sm:top-[2%] lg:top-[2%]"
                widthClass="w-[124px] sm:w-[150px] lg:w-[126px]"
                tone="own"
                float="float"
                delay={0.3}
              >
                A: You still up?
              </Bubble>
              <Bubble
                side="right"
                topClass="top-0 sm:top-[4%] lg:top-[2%]"
                widthClass="w-[128px] sm:w-[154px] lg:w-[132px]"
                tone="theirs"
                float="float-slow"
                delay={0.4}
              >
                B: Yeah, can&apos;t sleep
              </Bubble>
              <Bubble
                side="left"
                topClass="top-[47%] sm:top-[36%] lg:top-[36%]"
                widthClass="w-[124px] sm:w-[150px] lg:w-[126px]"
                tone="own"
                float="float-slow"
                delay={0.5}
              >
                A: Same... wanna talk for a bit?
              </Bubble>
              <Bubble
                side="right"
                topClass="top-[70%] sm:top-[26%] lg:top-[28%]"
                widthClass="w-[128px] sm:w-[154px] lg:w-[132px]"
                tone="theirs"
                float="float-drift"
                delay={0.6}
              >
                B: Always, what&apos;s on your mind?
              </Bubble>
              {/* The last pair needs the wide layout to sit clear of the
                  illustration's faces, so phones keep the four-bubble cluster. */}
              <Bubble
                side="left"
                topClass="top-[72%] sm:top-[70%] lg:top-[72%]"
                widthClass="w-[124px] sm:w-[150px] lg:w-[126px]"
                tone="own"
                float="float-drift"
                delay={0.7}
                visibilityClass="hidden sm:block"
              >
                A: Nothing. I just wanted your voice.
              </Bubble>
              <Bubble
                side="right"
                topClass="top-[76%] sm:top-[74%] lg:top-[74%]"
                widthClass="w-[128px] sm:w-[154px] lg:w-[132px]"
                tone="theirs"
                float="float"
                delay={0.8}
                visibilityClass="hidden sm:block"
              >
                B: Then stay a while.
              </Bubble>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
