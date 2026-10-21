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
  width: number;
  min: number;
  max: number;
  enabled: boolean;
  setWidth: (width: number, options?: { persist?: boolean }) => void;
  reset: () => void;
}

export function usePanelWidth(): PanelWidth {
  const preference = useUiStore((state) => state.panelWidth);
  const setPanelWidth = useUiStore((state) => state.setPanelWidth);
  const resetPanelWidth = useUiStore((state) => state.resetPanelWidth);
  const viewport = useViewportWidth();

  const max = panelWidthCeiling(viewport);
  const width = clampPanelWidth(preference, viewport);
  const enabled = isPanelResizable(viewport);

  useEffect(() => {
    applyPanelWidth(width);
  }, [width]);

  return { width, min: PANEL_WIDTH_MIN, max, enabled, setWidth: setPanelWidth, reset: resetPanelWidth };
}
