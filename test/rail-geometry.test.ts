import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";


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
    const boxes = rail.match(/h-11 w-12 shrink-0 items-center justify-center/g) ?? [];
    expect(boxes.length).toBe(1);
    const squares = rail.match(/<RailSquare>/g) ?? [];
    expect(squares.length).toBeGreaterThanOrEqual(3);
    expect(rail).toMatch(/<RailSquare>\s*\{icon\}/);
    expect(rail).toContain("<Avatar");
  });

  it("sizes the sidebar toggle as a row around RailSquare, not a 44 px button", () => {
    const toggle = rail.match(/<button[\s\S]*?app-rail-toggle[\s\S]*?<\/button>/);
    expect(toggle, "the toggle button must exist").not.toBeNull();
    expect(toggle![0]).not.toMatch(/\bw-11\b/);
    expect(toggle![0]).toContain("<RailSquare>");
  });

  it("fills the 44 px icon square, never the row", () => {
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
    const activeBranch = rail.match(/active\s*\?\s*"(text-\[[^"]*)"\s*:/);
    expect(activeBranch, "the active branch must exist").not.toBeNull();
    expect(activeBranch![1]).not.toContain("bg-[");
    expect(activeBranch![1]).toContain("--app-rail-text-strong");
    expect(rail).toContain('aria-current={active ? "page" : undefined}');
    expect(destinations).toContain('label: "Chats"');
    expect(destinations).not.toContain('"Conversations"');
    expect(rail).toContain("NAV_DESTINATIONS");
    expect(mobileNav).toContain("NAV_DESTINATIONS");
    expect(mobileNav).toContain('aria-current={active ? "page" : undefined}');
    expect(rail).toMatch(/aria-hidden="true"[\s\S]{0,200}bg-\[var\(--color-sage\)\]/);
  });
});
