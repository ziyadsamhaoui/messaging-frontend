#!/usr/bin/env node
/**
 * WCAG contrast measurement for the values actually used by the interface.
 *
 * The design constraints require contrast to be *measured*, never estimated, and
 * most of this app's colours are rgba() tints layered over a surface, so a plain
 * foreground/background pair is not the real composite a reader sees. This script
 * therefore supports `over`, which alpha-composites one or more translucent layers
 * onto an opaque surface before measuring.
 *
 * Usage:
 *   node scripts/contrast.mjs "#A4BE7B" "#1A3A20"
 *   node scripts/contrast.mjs "rgba(164,190,123,0.7) over #285430"
 *   node scripts/contrast.mjs line1 line2 line3 ...          # one pair per line
 *
 * Exit code is 0 when every pair reaches the threshold given with --min (default
 * 4.5) and 1 otherwise, so a pass cannot be claimed without seeing it.
 */

function parseColor(value) {
  const input = value.trim().replace(/^over\s+/i, "");
  const hex = input.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1];
    const full =
      raw.length === 3
        ? raw
            .split("")
            .map((char) => char + char)
            .join("")
        : raw;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgba = input.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i
  );
  if (!rgba) {
    throw new Error(`Unsupported colour: ${value}`);
  }
  return {
    r: Number(rgba[1]),
    g: Number(rgba[2]),
    b: Number(rgba[3]),
    a: rgba[4] === undefined ? 1 : Number(rgba[4]),
  };
}

function composite(layers) {
  // Right-most layer is the opaque surface; the rest are painted over it.
  const [surface, ...rest] = [...layers].reverse();
  let result = { ...surface };
  for (const layer of rest) {
    result = {
      r: layer.r * layer.a + result.r * (1 - layer.a),
      g: layer.g * layer.a + result.g * (1 - layer.a),
      b: layer.b * layer.a + result.b * (1 - layer.a),
      a: 1,
    };
  }
  return result;
}

function channel(value) {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

function luminance(color) {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function ratio(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgb(color) {
  return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
}

const args = process.argv.slice(2);
const minIndex = args.findIndex((arg) => arg === "--min");
const min = minIndex === -1 ? 4.5 : Number(args[minIndex + 1]);
const pairs =
  minIndex === -1 ? args : args.filter((_arg, index) => index !== minIndex && index !== minIndex + 1);

if (pairs.length === 0) {
  console.error("Provide at least one pair, e.g. \"#A4BE7B\" \"#1A3A20\".");
  process.exit(2);
}

let failures = 0;
for (const pair of pairs) {
  const [foregroundPart, backgroundPart] = pair.split(/\s+on\s+/i);
  const foregroundLayers = foregroundPart.split(/\s+over\s+/i).map(parseColor);
  const backgroundLayers = (backgroundPart ? backgroundPart.split(/\s+over\s+/i) : []).map(parseColor);
  const foreground = composite(foregroundLayers);
  const background = composite(backgroundLayers.length > 0 ? backgroundLayers : [{ r: 255, g: 255, b: 255, a: 1 }]);
  const value = ratio(foreground, background);
  const flag = value >= min ? "PASS" : "FAIL";
  if (value < min) failures += 1;
  console.log(
    `${flag}  ${value.toFixed(2)}:1  ${rgb(foreground)} on ${rgb(background)}   ${pair}   (min ${min})`
  );
}

process.exit(failures === 0 ? 0 : 1);
