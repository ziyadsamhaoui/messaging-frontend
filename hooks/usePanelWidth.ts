"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  PANEL_WIDTH_MIN,
  applyPanelWidth,
  clampPanelWidth,
  isPanelResizable,
  panelWidthCeiling,
  useUiStore,
} from "@/store/uiStore";

/**
 * The viewport width assumed while rendering on the server (and during hydration, which
 * `useSyncExternalStore` also serves from this snapshot, so the first client render
 * matches the server's HTML and there is no attribute mismatch to warn about).
 */
const SSR_VIEWPORT_WIDTH = 1440;

function subscribeToViewport(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function viewportWidth() {
  return window.innerWidth;
}

function serverViewportWidth() {
  return SSR_VIEWPORT_WIDTH;
}

function useViewportWidth() {
  return useSyncExternalStore(subscribeToViewport, viewportWidth, serverViewportWidth);
}

export interface PanelWidth {
  /** The width actually on screen: the stored preference clamped to this viewport. */
  width: number;
  min: number;
  /** 480 px, or 40% of the viewport, whichever is smaller. */
  max: number;
  /** False below 1024 px, where the panel is a fixed 300 px and the handle is hidden. */
  enabled: boolean;
  setWidth: (width: number, options?: { persist?: boolean }) => void;
  reset: () => void;
}

/**
 * One source of truth for the section panel's width.
 *
 * The store keeps the user's *preference*; this hook derives the width that is applied,
 * which is that preference clamped to the current viewport's ceiling. Keeping the two
 * apart is what lets the window narrow without destroying a wider preference, and it is
 * what makes the panel correct on a reload at a different size.
 *
 * The applied width is written to the document element (see `applyPanelWidth`) rather
 * than returned for JSX to place as an inline style, so the single property drives the
 * panel's CSS and the media query that clamps it below 1024 px.
 */
export function usePanelWidth(): PanelWidth {
  const preference = useUiStore((state) => state.panelWidth);
  const setPanelWidth = useUiStore((state) => state.setPanelWidth);
  const resetPanelWidth = useUiStore((state) => state.resetPanelWidth);
  const viewport = useViewportWidth();

  const max = panelWidthCeiling(viewport);
  const width = clampPanelWidth(preference, viewport);
  const enabled = isPanelResizable(viewport);

  // Written in an effect, not during render: a render must not touch the DOM, and the
  // width is also re-applied after a viewport change, which is exactly when the ceiling
  // moves and the panel would otherwise overflow it.
  useEffect(() => {
    applyPanelWidth(width);
  }, [width]);

  return { width, min: PANEL_WIDTH_MIN, max, enabled, setWidth: setPanelWidth, reset: resetPanelWidth };
}
