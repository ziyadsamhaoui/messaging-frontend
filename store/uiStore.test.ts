import { describe, expect, it } from "vitest";
import {
  PANEL_WIDTH_DEFAULT,
  PANEL_WIDTH_MAX,
  PANEL_WIDTH_MIN,
  clampPanelWidth,
  isPanelResizable,
  panelWidthCeiling,
} from "./uiStore";

describe("panelWidthCeiling", () => {
  it("allows the full 480 px on a wide viewport", () => {
    expect(panelWidthCeiling(1920)).toBe(PANEL_WIDTH_MAX);
    expect(panelWidthCeiling(1200)).toBe(PANEL_WIDTH_MAX);
  });

  it("takes 40% of the viewport when that is smaller", () => {
    expect(panelWidthCeiling(1024)).toBe(410);
    expect(panelWidthCeiling(1100)).toBe(440);
  });

  it("never falls below the 280 px floor, even on a viewport narrower than the panel", () => {
    expect(panelWidthCeiling(700)).toBe(PANEL_WIDTH_MIN);
    expect(panelWidthCeiling(400)).toBe(PANEL_WIDTH_MIN);
  });
});

describe("clampPanelWidth", () => {
  it("clamps up to the floor and down to the ceiling", () => {
    expect(clampPanelWidth(120, 1440)).toBe(PANEL_WIDTH_MIN);
    expect(clampPanelWidth(900, 1440)).toBe(PANEL_WIDTH_MAX);
    expect(clampPanelWidth(900, 1024)).toBe(410);
  });

  it("leaves a width inside the range alone, rounding it", () => {
    expect(clampPanelWidth(352, 1440)).toBe(352);
    expect(clampPanelWidth(351.6, 1440)).toBe(352);
  });

  it("falls back to the default rather than rendering NaN", () => {
    expect(clampPanelWidth(Number.NaN, 1440)).toBe(PANEL_WIDTH_DEFAULT);
  });
});

describe("isPanelResizable", () => {
  it("is off below 1024 px and on at and above it", () => {
    expect(isPanelResizable(1023)).toBe(false);
    expect(isPanelResizable(1024)).toBe(true);
  });
});
