"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  GROUP_INFO_SCROLL_OFFSET_PX,
  groupInfoSectionId,
  isAtScrollBottom,
  resolveActiveSectionId,
  type GroupInfoTab,
  type GroupInfoTabId,
  type SectionPosition,
} from "@/lib/groupInfo";

const RESUME_FALLBACK_MS = 900;

export function prefersReducedMotion(): boolean {
  if (typeof document !== "undefined" && document.documentElement.dataset.motion === "never") {
    return true;
  }
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface GroupInfoScroll {
  scrollRef: RefObject<HTMLDivElement | null>;
  activeId: GroupInfoTabId | null;
  scrollToTab: (id: GroupInfoTabId) => void;
}

export function useGroupInfoScroll(
  tabs: ReadonlyArray<GroupInfoTab>,
  enabled = true
): GroupInfoScroll {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveIdState] = useState<GroupInfoTabId | null>(tabs[0]?.id ?? null);
  const activeRef = useRef<GroupInfoTabId | null>(activeId);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

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

  useEffect(() => {
    if (tabs.length === 0) {
      setActiveId(null);
      return;
    }
    if (!tabs.some((tab) => tab.id === activeRef.current)) {
      if (pausedRef.current) scheduleUpdate();
      else update();
    }
  }, [scheduleUpdate, setActiveId, tabs, update]);

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

  return { scrollRef, activeId, scrollToTab };
}
