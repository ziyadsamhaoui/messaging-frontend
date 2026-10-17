import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PanelResizeHandle } from "./PanelResizeHandle";
import { PANEL_WIDTH_DEFAULT, PANEL_WIDTH_MIN, useUiStore } from "@/store/uiStore";

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true });
  fireEvent(window, new Event("resize"));
}

function handle() {
  return screen.getByRole("separator", { name: "Resize panel" });
}

beforeEach(() => {
  setViewport(1440);
  useUiStore.setState({ panelWidth: PANEL_WIDTH_DEFAULT });
});

afterEach(() => {
  setViewport(1440);
});

/*
 * The handle is the only way to resize the section panel, so it has to be a real control
 * for both a pointer and a keyboard, and its ARIA values have to describe the limits it
 * actually enforces.
 */
describe("PanelResizeHandle", () => {
  it("is a focusable vertical separator carrying its limits", () => {
    render(<PanelResizeHandle />);
    const el = handle();
    expect(el).toHaveAttribute("aria-orientation", "vertical");
    expect(el).toHaveAttribute("aria-valuemin", String(PANEL_WIDTH_MIN));
    expect(el).toHaveAttribute("aria-valuemax", "480");
    expect(el).toHaveAttribute("aria-valuenow", String(PANEL_WIDTH_DEFAULT));
    expect(el).toHaveAttribute("tabindex", "0");
  });

  it("moves 16 px with an arrow key and 48 px with Shift", async () => {
    render(<PanelResizeHandle />);
    handle().focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(useUiStore.getState().panelWidth).toBe(PANEL_WIDTH_DEFAULT + 16);

    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(useUiStore.getState().panelWidth).toBe(PANEL_WIDTH_DEFAULT + 16 + 48);

    await userEvent.keyboard("{ArrowLeft}");
    expect(useUiStore.getState().panelWidth).toBe(PANEL_WIDTH_DEFAULT + 48);
  });

  it("jumps to the limits with Home and End", async () => {
    render(<PanelResizeHandle />);
    handle().focus();

    await userEvent.keyboard("{Home}");
    expect(useUiStore.getState().panelWidth).toBe(PANEL_WIDTH_MIN);

    await userEvent.keyboard("{End}");
    expect(useUiStore.getState().panelWidth).toBe(480);
  });

  it("resets to the default with Enter and with a double click", async () => {
    render(<PanelResizeHandle />);
    handle().focus();

    await userEvent.keyboard("{End}");
    await userEvent.keyboard("{Enter}");
    expect(useUiStore.getState().panelWidth).toBe(PANEL_WIDTH_DEFAULT);

    await userEvent.keyboard("{End}");
    fireEvent.doubleClick(handle());
    expect(useUiStore.getState().panelWidth).toBe(PANEL_WIDTH_DEFAULT);
  });

  it("cannot be pushed past the limits from the keyboard", async () => {
    render(<PanelResizeHandle />);
    handle().focus();

    await userEvent.keyboard("{Shift>}{ArrowLeft}{/Shift}{Shift>}{ArrowLeft}{/Shift}{Shift>}{ArrowLeft}{/Shift}");
    expect(useUiStore.getState().panelWidth).toBe(PANEL_WIDTH_MIN);
  });

  it("resizes on a pointer drag and yields the keyboard step to the drag", () => {
    render(<PanelResizeHandle />);
    const el = handle();

    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 300 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 360 });
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 360 });

    expect(useUiStore.getState().panelWidth).toBe(PANEL_WIDTH_DEFAULT + 60);
  });

  it("reports the smaller ceiling below 1024 px and stops responding", async () => {
    setViewport(900);
    render(<PanelResizeHandle />);
    const el = handle();

    // 40% of 900 is 360, which is above the 280 px floor but below the 480 px ceiling.
    expect(el).toHaveAttribute("aria-valuemax", "360");
    expect(el.className).toContain("pointer-events-none");

    el.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(useUiStore.getState().panelWidth).toBe(PANEL_WIDTH_DEFAULT);
  });

  it("clamps a stored width against the current viewport without losing the preference", () => {
    useUiStore.setState({ panelWidth: 480 });
    setViewport(1024);
    render(<PanelResizeHandle />);

    // Applied width is clamped for this viewport...
    expect(handle()).toHaveAttribute("aria-valuenow", "410");
    // ...while the stored preference is untouched, so a wider window restores it.
    setViewport(1920);
    expect(handle()).toHaveAttribute("aria-valuenow", "480");
  });
});
