import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { OnlineStatus } from "@/lib/types";
import { presenceDotClass, presenceLabel } from "@/lib/presence";

export type AvatarSize = 28 | 40 | 48 | 72 | 88 | 96 | 120 | 176;

const VARIANTS: Array<{ fill: string; text: string }> = [
  { fill: "#C2D6A0", text: "#1A3A20" },
  { fill: "#A4BE7B", text: "#1A3A20" },
  { fill: "#8FAD62", text: "#1A3A20" },
  { fill: "#7FB069", text: "#1A3A20" },
  { fill: "#4A7040", text: "#F1E9D2" },
  { fill: "#285430", text: "#F1E9D2" },
];

function variantFor(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100_000;
  }
  return VARIANTS[hash % VARIANTS.length];
}

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
  72: "h-[72px] w-[72px] text-2xl",
  88: "h-[88px] w-[88px] text-3xl",
  96: "h-24 w-24 text-2xl",
  120: "h-[120px] w-[120px] text-4xl",
  176: "h-[176px] w-[176px] text-6xl",
};

const DOT_SIZES: Record<AvatarSize, string> = {
  28: "h-2.5 w-2.5 border-2",
  40: "h-3 w-3 border-2",
  48: "h-3.5 w-3.5 border-2",
  72: "h-4 w-4 border-[3px]",
  88: "h-5 w-5 border-[3px]",
  96: "h-5 w-5 border-[3px]",
  120: "h-6 w-6 border-[3px]",
  176: "h-8 w-8 border-4",
};

function asImageUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  try {
    const parsed = new URL(src);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:" && parsed.protocol !== "blob:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function useImageReady(url: string | null): boolean {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    const probe = new Image();
    probe.onload = () => setLoadedUrl(url);
    probe.src = url;
    return () => {
      probe.onload = null;
    };
  }, [url]);
  return url !== null && loadedUrl === url;
}

interface AvatarProps {
  name: string;
  seed?: string;
  src?: string | null;
  size?: AvatarSize;
  status?: OnlineStatus;
  className?: string;
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
  const imageReady = useImageReady(imageUrl);
  const initials = initialsFor(name);

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full font-ui font-semibold uppercase",
          SIZES[size]
        )}
        style={{ backgroundColor: variant.fill, color: variant.text }}
      >
        {initials}
        {imageReady && imageUrl && (
          <span
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
          />
        )}
      </span>
      {status && (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "absolute rounded-full",
              DOT_SIZES[size],
              presenceDotClass[status]
            )}
            style={{
              left: "85.36%",
              top: "85.36%",
              transform: "translate(-50%, -50%)",
              borderColor: presenceRing,
            }}
          />
          <span className="sr-only">{presenceLabel(status)}</span>
        </>
      )}
    </span>
  );
}
