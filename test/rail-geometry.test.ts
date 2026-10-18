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
const destinations = readFileSync(
  join(ROOT, "components", "layout", "navDestinations.ts"),
  "utf8"
);
const mobileNav = readFileSync(join(ROOT, "components", "layout", "MobileNav.tsx"), "utf8");

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

  it("keeps exactly one 48 px icon box, shared by every icon-bearing row", () => {
    // The anchor is defined once, in `RailSquare`, and used by the destination rows,
    // the sign-out row and the user avatar. One definition is what stops the rows
    // from drifting off the 36 px axis one at a time — the failure mode this test
    // exists for.
    const boxes = rail.match(/h-11 w-12 shrink-0 items-center justify-center/g) ?? [];
    expect(boxes.length).toBe(1);
    const squares = rail.match(/<RailSquare>/g) ?? [];
    expect(squares.length).toBeGreaterThanOrEqual(3);
    expect(rail).toMatch(/<RailSquare>\s*\{icon\}/);
    expect(rail).toContain("<Avatar");
  });

  it("sizes the sidebar toggle as a row around RailSquare, not a 44 px button", () => {
    // `.app-rail-row` insets 12 px each side. A `w-11` button therefore has a 20 px
    // content box, and the 44 px square inside it was squeezed to 20 x 44 — a narrow
    // hover strip for the one control that sits in the header. It must size itself
    // around the shared RailSquare, like every destination row.
    const toggle = rail.match(/<button[\s\S]*?app-rail-toggle[\s\S]*?<\/button>/);
    expect(toggle, "the toggle button must exist").not.toBeNull();
    expect(toggle![0]).not.toMatch(/\bw-11\b/);
    expect(toggle![0]).toContain("<RailSquare>");
  });

  it("fills the 44 px icon square, never the row", () => {
    // The regression: `hover:bg-[var(--app-rail-hover)]` on `.app-rail-row` painted
    // the whole row, so the highlight stretched with the expanded rail (248 px) and
    // read as a selected row rather than an icon target. The fill must be on
    // `.app-rail-square`, and the row's own rule must not set a background at all.
    const rowBlock = css.match(/\n\.app-rail-row \{[^}]*\}/);
    expect(rowBlock, "the row rule must exist").not.toBeNull();
    expect(rowBlock![0]).toContain("padding-inline: 12px");
    expect(rowBlock![0].includes("background")).toBe(false);

    const hover = css.match(/\.app-rail-row:hover \.app-rail-square \{[^}]*\}/);
    expect(hover, "hovering the row (icon or label) lights the icon square").not.toBeNull();
    expect(hover![0]).toContain("background-color");

    const active = css.match(/\.app-rail-row\[data-active="true"\] \.app-rail-square \{[^}]*\}/);
    expect(active, "the active row lights the same square more strongly").not.toBeNull();

    expect(css.match(/\n  --app-rail-icon-hover/), "hover token").not.toBeNull();
    expect(css.match(/\n  --app-rail-icon-active/), "active token").not.toBeNull();
  });

  it("shows keyboard focus on the 44 px square, not around the row", () => {
    const focus = css.match(/\.app-rail-row:focus-visible \.app-rail-square \{[^}]*\}/);
    expect(focus, "the square must carry the focus ring").not.toBeNull();
    expect(focus![0]).toContain("outline:");
    const rowFocus = css.match(/\.app-rail-row:focus-visible \{[^}]*\}/);
    expect(rowFocus, "the row's own outline is suppressed").not.toBeNull();
    expect(rowFocus![0]).toContain("outline: none");
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
    // The destination list is shared with the mobile bar, so the name lives in one
    // place: "Chats" everywhere, never "Conversations".
    expect(destinations).toContain('label: "Chats"');
    expect(destinations).not.toContain('"Conversations"');
    expect(rail).toContain("NAV_DESTINATIONS");
    expect(mobileNav).toContain("NAV_DESTINATIONS");
    expect(mobileNav).toContain('aria-current={active ? "page" : undefined}');
    expect(rail).toMatch(/aria-hidden="true"[\s\S]{0,200}bg-\[var\(--color-sage\)\]/);
  });
});
