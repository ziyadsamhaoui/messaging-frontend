import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * The collapsed rail's geometry is a contract: every icon's centre sits on the same
 * 36 px axis in both states, and 36 px is exactly half of the collapsed 72 px rail.
 *
 * jsdom has no layout engine, so a rendered test cannot measure this. What can be
 * pinned here is the pair of source facts the geometry depends on — the two mistakes
 * that were actually in the code:
 *
 *   1. Labels were hidden with `opacity`/`visibility`, which leaves them in layout. In a
 *      row that centres its contents, an invisible label is still half the content, so
 *      the icon gets pushed off-axis. The rule must remove it from layout.
 *   2. The row's 12 px inset was zeroed when collapsed and the list added its own
 *      `px-3`, so the icon box started 24 px in instead of 12 px and the centre landed
 *      at 48 px instead of 36 px. Exactly one 12 px inset may exist.
 */

const ROOT = join(__dirname, "..");
const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
const rail = readFileSync(join(ROOT, "components", "layout", "Rail.tsx"), "utf8");

describe("collapsed rail geometry", () => {
  it("removes labels from layout when collapsed, rather than hiding them", () => {
    const block = css.match(/html\[data-sidebar="collapsed"\] \.app-rail-label \{[^}]*\}/);
    expect(block, "the collapsed label rule must exist").not.toBeNull();
    expect(block![0]).toContain("display: none");
    expect(block![0]).not.toContain("opacity");
    expect(block![0]).not.toContain("visibility");
  });

  it("keeps the row's 12 px inset when collapsed instead of centring the row", () => {
    const block = css.match(/html\[data-sidebar="collapsed"\] \.app-rail-row \{[^}]*\}/);
    expect(block, "the collapsed row rule must exist").not.toBeNull();
    expect(block![0]).toContain("padding-inline: 12px");
    expect(block![0]).not.toContain("justify-content: center");
  });

  it("gives the rows no horizontal padding of their own beyond the inset", () => {
    const offenders = rail
      .split("\n")
      .map((line, index) => ({ line, index: index + 1 }))
      .filter(({ line }) => /<(ul|div)[^>]*className=/.test(line) && /\bpx-\d/.test(line))
      .filter(({ line }) => !line.includes("app-rail-header") && !line.includes("app-rail-brand"));
    expect(offenders).toEqual([]);
  });

  it("wraps every icon and the avatar in the 48 px icon box", () => {
    // Destination-row box, sign-out box and profile-avatar box. Every icon-bearing
    // row in the rail shares the same 48 px anchor, which is what keeps all of them
    // on the 36 px axis when the labels are removed from layout.
    const boxes = rail.match(/h-11 w-12 shrink-0 items-center justify-center/g) ?? [];
    expect(boxes.length).toBe(3);
  });

  it("marks the active destination with a left line and no background fill", () => {
    // The active row's background must stay the rail's own; only the marker and the
    // stronger text colour distinguish it. `aria-current` carries the meaning for
    // assistive tech, so the marker is decorative.
    const activeBranch = rail.match(/active\s*\?\s*"(text-\[[^"]*)"\s*:/);
    expect(activeBranch, "the active branch must exist").not.toBeNull();
    expect(activeBranch![1]).not.toContain("bg-[");
    expect(activeBranch![1]).toContain("--app-rail-text-strong");
    expect(rail).toContain('aria-current={active ? "page" : undefined}');
    expect(rail).toMatch(/aria-hidden="true"[\s\S]{0,200}bg-\[var\(--color-sage\)\]/);
  });
});
