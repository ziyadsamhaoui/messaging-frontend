import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, buttonClasses } from "./Button";

/*
 * Two rules are pinned here, and the second one is a constraint on this task rather
 * than a preference:
 *
 *   1. The app screen's buttons are flat — one opaque fill, no contact shadow, no hover
 *      lift — at 14 px medium.
 *   2. The marketing and authentication surfaces keep the sculpted treatment they were
 *      designed with, because the palette, the landing page and the auth pages are out
 *      of scope. If someone "tidies" `dark` and `light` later, this fails.
 */
describe("app screen tones are flat", () => {
  const appTones = ["panel", "pane"] as const;

  for (const tone of appTones) {
    it(`${tone}: no shadow and no hover lift on any variant`, () => {
      for (const variant of ["primary", "secondary", "ghost", "danger"] as const) {
        const classes = buttonClasses({ tone, variant });
        expect(classes).not.toMatch(/shadow-\[/);
        expect(classes).not.toContain("hover:-translate-y");
        expect(classes).not.toContain("backdrop-blur");
      }
    });

    it(`${tone}: labels are 14 px medium`, () => {
      for (const variant of ["primary", "secondary", "ghost", "danger"] as const) {
        const classes = buttonClasses({ tone, variant });
        expect(classes).toContain("font-medium");
        expect(classes).toContain("text-sm");
      }
    });

    it(`${tone}: uses the one control radius and the three heights`, () => {
      expect(buttonClasses({ tone })).toContain("rounded-[var(--radius-control)]");
      expect(buttonClasses({ tone, size: "sm" })).toContain("--control-height-sm");
      expect(buttonClasses({ tone, size: "md" })).toContain("--control-height-md");
      expect(buttonClasses({ tone, size: "lg" })).toContain("--control-height-lg");
    });
  }
});

describe("marketing tones are left alone", () => {
  it("keeps the sculpted primary on the dark and light surfaces", () => {
    expect(buttonClasses({ tone: "dark", variant: "primary" })).toContain("hover:-translate-y-0.5");
    expect(buttonClasses({ tone: "dark", variant: "primary" })).toMatch(/shadow-\[/);
    expect(buttonClasses({ tone: "light", variant: "secondary" })).toMatch(/shadow-\[/);
  });
});

describe("Button", () => {
  it("renders its label and forwards disabled", () => {
    render(
      <Button tone="pane" disabled>
        Save changes
      </Button>
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
});
