import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * The typography rule, enforced rather than documented.
 *
 * The decorative display serif (Cormorant Garamond) and the body serif (Newsreader)
 * belong to the wordmark and to the public pages. Inside the authenticated app every
 * label, title, button, input, placeholder and message uses the interface sans
 * (`font-ui`), which the shell root sets once and everything below inherits.
 *
 * This is a source-level check, not a rendered one: it reads the files and fails if a
 * serif utility reappears anywhere in the app tree. Combined with `font-ui` on the
 * app shell root, that is what makes "no serif outside the wordmark" hold as the app
 * grows — a computed-style pass in a browser would only prove it for the screens it
 * happened to visit.
 *
 * The exception list is deliberately explicit: adding a name to it is a visible,
 * reviewable decision rather than an accident.
 */

const ROOT = join(__dirname, "..");

/** Directories that make up the authenticated application. */
const APP_DIRS = [
  join(ROOT, "components", "layout"),
  join(ROOT, "components", "conversations"),
  join(ROOT, "components", "connections"),
  join(ROOT, "components", "notifications"),
  join(ROOT, "components", "settings"),
  join(ROOT, "components", "invites"),
  join(ROOT, "components", "chat"),
  join(ROOT, "components", "sidebar"),
  join(ROOT, "components", "ui"),
  join(ROOT, "app", "app"),
];

/** Shared components that belong to the public pages, not the app screen. */
const PUBLIC_ONLY = [
  join("components", "ui", "SiteHeader.tsx"),
  join("components", "ui", "Wordmark.tsx"),
];

/**
 * The one allowed serif usage in the app tree: the sidebar header wordmark, which is
 * the only place the rule keeps the display face.
 *
 * Normalised to forward slashes because the scanned path is normalised too; comparing
 * a platform path against a normalised one silently exempts nothing on Windows.
 */
const ALLOWED = [join("components", "layout", "Rail.tsx").split(sep).join("/")];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const SERIF = /font-(?:display|body|serif)\b/;

/**
 * Strips comments before scanning.
 *
 * Without this the check fails on prose: a comment that *explains* the rule ("the base
 * stylesheet sets body font-family to the body serif") names the very utilities it is
 * describing. Only real class usage should count.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("typography", () => {
  const files = APP_DIRS.flatMap(sourceFiles).filter((file) => {
    const relativePath = relative(ROOT, file);
    return !PUBLIC_ONLY.some((publicFile) => relativePath.endsWith(publicFile));
  });

  it("finds the app tree (so an empty scan cannot pass silently)", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it("uses no serif family anywhere in the app tree except the workspace wordmark", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const relativePath = relative(ROOT, file).split(sep).join("/");
      if (ALLOWED.includes(relativePath)) continue;
      const source = stripComments(readFileSync(file, "utf8"));
      source.split("\n").forEach((line, index) => {
        if (SERIF.test(line)) offenders.push(`${relativePath}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the serif on the wordmark, and only on the wordmark, in the rail", () => {
    const rail = stripComments(readFileSync(join(ROOT, "components", "layout", "Rail.tsx"), "utf8"));
    const lines = rail.split("\n");
    const serifLines = lines.map((line, index) => ({ line, index })).filter(({ line }) => SERIF.test(line));

    expect(serifLines).toHaveLength(1);
    expect(serifLines[0].line).toContain("app-rail-label");
    // The class list and the word it styles are adjacent lines of the same element.
    const element = lines.slice(serifLines[0].index, serifLines[0].index + 3).join(" ");
    expect(element).toContain("BadrLink");
  });

  it("sets the interface face once, on the shell root", () => {
    const frame = readFileSync(join(ROOT, "components", "layout", "AppFrame.tsx"), "utf8");
    expect(frame.match(/font-ui/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
