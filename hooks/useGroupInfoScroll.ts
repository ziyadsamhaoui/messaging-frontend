"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  GROUP_INFO_HEADER_PX,
  GROUP_INFO_HERO_ID,
  GROUP_INFO_SCROLL_OFFSET_PX,
  groupInfoSectionId,
  isAtScrollBottom,
  resolveActiveSectionId,
  type GroupInfoTab,
  type GroupInfoTabId,
  type SectionPosition,
} from "@/lib/groupInfo";

/** A smooth scroll that has not reported `scrollend` by now is treated as done. */
const RESUME_FALLBACK_MS = 900;

/**
 * True when the reader asked for less motion, either through the operating system
 * or through the app's own preference. `data-motion` is written by the prefs store;
 * `never` means never animate.
 */
export function prefersReducedMotion(): boolean {
  if (typeof document !== "undefined" && document.documentElement.dataset.motion === "never") {
    return true;
  }
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface GroupInfoScroll {
  /** The one scroll container for the page. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** The section whose tab is current. */
  activeId: GroupInfoTabId | null;
  /** True once the hero has scrolled out from under the sticky header. */
  heroCollapsed: boolean;
  /** Scroll a section under the sticky bars and move the indicator at once. */
  scrollToTab: (id: GroupInfoTabId) => void;
}

/**
 * Drives the sticky tabs from a single scroll container.
 *
 * The active section is the last one whose top has crossed the line just below the
 * sticky header and tab bar. Positions are measured from the container's own scroll
 * offset, so they survive a resize, a member list that grows, a section that appears
 * or disappears, and the panel being resized — a ResizeObserver re-measures the
 * container and each section whenever their height changes.
 *
 * While a tab-triggered smooth scroll runs the spy is paused, so the indicator does
 * not bounce through the sections in between. It resumes on `scrollend`, on a short
 * timeout, or immediately when the reader scrolls by hand.
 */
export function useGroupInfoScroll(
  tabs: ReadonlyArray<GroupInfoTab>,
  enabled = true
): GroupInfoScroll {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveIdState] = useState<GroupInfoTabId | null>(tabs[0]?.id ?? null);
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const activeRef = useRef<GroupInfoTabId | null>(activeId);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  /** Only write state when a different section actually takes over. */
  const setActiveId = useCallback((id: GroupInfoTabId | null) => {
    if (id === activeRef.current) return;
    activeRef.current = id;
    setActiveIdState(id);
  }, []);

  const measure = useCallback((): SectionPosition[] => {
    const container = scrollRef.current;
    if (!container || typeof document === "undefined") return [];
    const containerTop = container.getBoundingClientRect().top;
    return tabs.map((tab) => {
      const section = document.getElementById(groupInfoSectionId(tab.id));
      return {
        id: tab.id,
        top: section
          ? section.getBoundingClientRect().top - containerTop + container.scrollTop
          : Number.POSITIVE_INFINITY,
      };
    });
  }, [tabs]);

  const update = useCallback(() => {
    const container = scrollRef.current;
    if (!container || pausedRef.current) return;

    const positions = measure();
    const atBottom = isAtScrollBottom({
      scrollTop: container.scrollTop,
      clientHeight: container.clientHeight,
      scrollHeight: container.scrollHeight,
    });
    const referenceLine = container.scrollTop + GROUP_INFO_SCROLL_OFFSET_PX;
    const next = resolveActiveSectionId(positions, referenceLine, atBottom);
    setActiveId(next as GroupInfoTabId | null);

    const hero = document.getElementById(GROUP_INFO_HERO_ID);
    const collapsed = hero
      ? hero.getBoundingClientRect().bottom <=
        container.getBoundingClientRect().top + GROUP_INFO_HEADER_PX
      : false;
    setHeroCollapsed((previous) => (previous === collapsed ? previous : collapsed));
  }, [measure, setActiveId]);

  const scheduleUpdate = useCallback(() => {
    if (typeof requestAnimationFrame !== "function") {
      update();
      return;
    }
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      update();
    });
  }, [update]);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    clearResumeTimer();
    scheduleUpdate();
  }, [clearResumeTimer, scheduleUpdate]);

  // Re-measure on scroll and whenever the page's height changes.
  useEffect(() => {
    if (!enabled) return;
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => scheduleUpdate();
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => scheduleUpdate());
      observer.observe(container);
      for (const tab of tabs) {
        const section = document.getElementById(groupInfoSectionId(tab.id));
        if (section) observer.observe(section);
      }
    }

    scheduleUpdate();

    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      observer?.disconnect();
      if (frameRef.current !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
    };
  }, [enabled, scheduleUpdate, tabs]);

  // A section that disappears (the last invitation is accepted) must not leave its
  // tab current: fall back to the first tab that still exists.
  useEffect(() => {
    if (tabs.length === 0) {
      setActiveId(null);
      return;
    }
    if (!tabs.some((tab) => tab.id === activeRef.current)) {
      setActiveId(tabs[0].id);
    }
  }, [setActiveId, tabs]);

  // Scrolling by hand during a programmatic scroll resumes the spy at once.
  useEffect(() => {
    if (!enabled) return;
    const container = scrollRef.current;
    if (!container) return;

    const onIntent = (event: Event) => {
      if (!pausedRef.current) return;
      const target = event.target as Element | null;
      if (target?.closest?.("[data-group-info-tabs]")) return;
      resume();
    };

    const onKeyIntent = (event: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
        return;
      }
      const target = event.target as Element | null;
      if (target?.closest?.("[data-group-info-tabs]")) return;
      onIntent(event);
    };

    container.addEventListener("wheel", onIntent, { passive: true });
    container.addEventListener("touchstart", onIntent, { passive: true });
    container.addEventListener("pointerdown", onIntent);
    container.addEventListener("keydown", onKeyIntent);
    return () => {
      container.removeEventListener("wheel", onIntent);
      container.removeEventListener("touchstart", onIntent);
      container.removeEventListener("pointerdown", onIntent);
      container.removeEventListener("keydown", onKeyIntent);
    };
  }, [enabled, resume]);

  useEffect(() => () => clearResumeTimer(), [clearResumeTimer]);

  const scrollToTab = useCallback(
    (id: GroupInfoTabId) => {
      // The indicator moves immediately; the spy stays out of the way until the
      // section has landed.
      setActiveId(id);
      const container = scrollRef.current;
      const section = typeof document !== "undefined" ? document.getElementById(groupInfoSectionId(id)) : null;
      if (!container || !section) return;

      const top = Math.max(
        0,
        section.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop -
          GROUP_INFO_SCROLL_OFFSET_PX
      );

      pausedRef.current = true;
      clearResumeTimer();

      if (prefersReducedMotion()) {
        container.scrollTop = top;
        pausedRef.current = false;
        scheduleUpdate();
        return;
      }

      const finish = () => {
        container.removeEventListener("scrollend", finish);
        clearResumeTimer();
        pausedRef.current = false;
        scheduleUpdate();
      };

      if (typeof container.scrollTo === "function") {
        container.scrollTo({ top, behavior: "smooth" });
      } else {
        container.scrollTop = top;
      }
      if ("onscrollend" in container) {
        container.addEventListener("scrollend", finish);
      }
      resumeTimerRef.current = setTimeout(finish, RESUME_FALLBACK_MS);
    },
    [clearResumeTimer, scheduleUpdate, setActiveId]
  );

  return { scrollRef, activeId, heroCollapsed, scrollToTab };
}
