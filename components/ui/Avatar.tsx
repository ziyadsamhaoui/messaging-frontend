import React from "react";
import { cn } from "@/lib/utils";
import { OnlineStatus } from "@/lib/types";
import { presenceDotClass, presenceLabel } from "@/lib/presence";

export type AvatarSize = 28 | 40 | 48 | 96;

/*
 * Tonal variants of the existing palette, one per person and stable across the
 * app, so the same face is always the same colour. Each pair was measured with
 * `scripts/contrast.mjs` and every one is at or above 4.5:1 for the initials:
 * sage-light 8.04, sage 6.13, sage-muted 4.98, success 4.98, fern-dark 4.70,
 * forest 7.22. A blank gradient circle is what this replaces — including for rooms,
 * which fall back to the room's initials.
 */
const VARIANTS: Array<{ fill: string; text: string }> = [
  { fill: "#C2D6A0", text: "#1A3A20" },
  { fill: "#A4BE7B", text: "#1A3A20" },
  { fill: "#8FAD62", text: "#1A3A20" },
  { fill: "#7FB069", text: "#1A3A20" },
  { fill: "#4A7040", text: "#F1E9D2" },
  { fill: "#285430", text: "#F1E9D2" },
];

/** Stable, order-independent hash so the variant does not depend on list position. */
function variantFor(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100_000;
  }
  return VARIANTS[hash % VARIANTS.length];
}

/**
 * The initials shown when there is no profile picture.
 *
 * A single-word name takes its first letter plus, in this order of preference, a
 * trailing digit or the second letter: `admin` reads AD, `admin2` reads A2 and
 * `admin3` reads A3. Taking the first two letters of every name is what produced
 * three identical "AD" avatars for three different people — the second letter of
 * `admin2` is `d`, so the digit that actually distinguishes the accounts was
ever reached.
 *
 * A multi-word name keeps first-plus-last ("Emma Stone" is ES), because there the
 * second word already carries the distinguishing information.
 *
 * Exported so the rule can be asserted directly in a test rather than only through
 * a rendered avatar.
 */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const word = parts[0];
  const last = word[word.length - 1];
  if (/\d/.test(last) && word.length > 1) return (word[0] + last).toUpperCase();
  return word.slice(0, 2).toUpperCase();
}

const SIZES: Record<AvatarSize, string> = {
  28: "h-7 w-7 text-[11px]",
  40: "h-10 w-10 text-xs",
  48: "h-12 w-12 text-sm",
  96: "h-24 w-24 text-2xl",
};

const DOT_SIZES: Record<AvatarSize, string> = {
  28: "h-2.5 w-2.5 border-2",
  40: "h-3 w-3 border-2",
  48: "h-3.5 w-3.5 border-2",
  96: "h-5 w-5 border-[3px]",
};

/**
 * Only absolute http(s) URLs are used as an image; anything else (a relative path,
 * a `javascript:` string) falls back to initials rather than being injected into a
 * CSS `url()`.
 */
function asImageUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  try {
    const parsed = new URL(src);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

interface AvatarProps {
  /** Display name: used for the initials and for colour selection when `seed` is absent. */
  name: string;
  /** Stable identity for the tonal variant (user id or room id). Defaults to `name`. */
  seed?: string;
  src?: string | null;
  size?: AvatarSize;
  status?: OnlineStatus;
  className?: string;
  /** Colour the presence dot is ringed with, so it sits on the surface behind it. */
  presenceRing?: string;
}

export function Avatar({
  name,
  seed,
  src,
  size = 40,
  status,
  className,
  presenceRing = "var(--app-panel)",
}: AvatarProps) {
  const variant = variantFor(seed ?? name);
  const imageUrl = asImageUrl(src);
  const initials = initialsFor(name);

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full font-ui font-semibold uppercase",
          SIZES[size]
        )}
        style={
          imageUrl
            ? { backgroundImage: `url(${JSON.stringify(imageUrl)})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundColor: variant.fill, color: variant.text }
        }
      >
        {!imageUrl && initials}
      </span>
      {status && (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "absolute -bottom-0.5 -right-0.5 rounded-full",
              DOT_SIZES[size],
              presenceDotClass[status]
            )}
            style={{ borderColor: presenceRing }}
          />
          <span className="sr-only">{presenceLabel(status)}</span>
        </>
      )}
    </span>
  );
}
