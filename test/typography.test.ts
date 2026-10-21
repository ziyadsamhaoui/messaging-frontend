import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";


const ROOT = join(__dirname, "..");

const APP_DIRS = [
  join(ROOT, "components", "layout"),
  join(ROOT, "components", "conversations"),
  join(ROOT, "components", "connections"),
  join(ROOT, "components", "notifications"),
  join(ROOT, "components", "settings"),
  join(ROOT, "components", "invites"),
  join(ROOT, "components", "chat"),
  join(ROOT, "components", "ui"),
  join(ROOT, "app", "app"),
];

const PUBLIC_ONLY = [
  join("components", "ui", "SiteHeader.tsx"),
  join("components", "ui", "Wordmark.tsx"),
];

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
    const element = lines.slice(serifLines[0].index, serifLines[0].index + 3).join(" ");
    expect(element).toContain("BadrLink");
  });

  it("sets the interface face once, on the shell root", () => {
    const frame = readFileSync(join(ROOT, "components", "layout", "AppFrame.tsx"), "utf8");
    expect(frame.match(/font-ui/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
