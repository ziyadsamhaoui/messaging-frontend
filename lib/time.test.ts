import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatCount,
  formatDayLabel,
  formatListTime,
  formatRelative,
  isSameDay,
  parseTimestamp,
} from "./time";

/*
 * One shared time vocabulary is the point of this module, so these tests pin the
 * day boundaries (calendar-based, not 24-hour-based) rather than the exact locale
 * output, which the runtime is allowed to choose.
 */
const NOW = new Date("2026-10-14T12:00:00.000Z");

function freeze() {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("parseTimestamp", () => {
  it("returns null instead of an invalid date", () => {
    expect(parseTimestamp("not a date")).toBeNull();
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp(undefined)).toBeNull();
  });

  it("parses a real timestamp", () => {
    expect(parseTimestamp("2026-10-14T09:30:00.000Z")).toBeInstanceOf(Date);
  });
});

describe("formatCount", () => {
  it("caps at the caller's maximum", () => {
    expect(formatCount(12, 9)).toBe("9+");
    expect(formatCount(1240)).toBe("99+");
    expect(formatCount(1240, 999)).toBe("999+");
  });

  it("renders zero for a missing count rather than an empty badge", () => {
    expect(formatCount(0)).toBe("0");
  });
});

describe("calendar-day boundaries", () => {
  it("treats two instants on the same local day as the same day", () => {
    expect(isSameDay("2026-10-13T23:10:00", "2026-10-13T00:10:00")).toBe(true);
  });

  it("does not treat adjacent days as the same day", () => {
    expect(isSameDay("2026-10-13T23:59:00", "2026-10-14T00:01:00")).toBe(false);
  });
});

describe("formatDayLabel", () => {
  it("names today and yesterday", () => {
    freeze();
    expect(formatDayLabel("2026-10-14T08:00:00")).toBe("Today");
    expect(formatDayLabel("2026-10-13T08:00:00")).toBe("Yesterday");
  });

  it("falls back to a weekday name inside the last week", () => {
    freeze();
    // 2026-10-11 is a Sunday.
    expect(formatDayLabel("2026-10-11T08:00:00")).toMatch(/Sunday/);
  });
});

describe("formatListTime and formatRelative", () => {
  it("uses the clock for today and the word for yesterday", () => {
    freeze();
    expect(formatListTime("2026-10-14T08:05:00")).toMatch(/\d{1,2}[:.]\d{2}/);
    expect(formatListTime("2026-10-13T08:00:00")).toBe("Yesterday");
  });

  it("describes recency coarsely", () => {
    freeze();
    expect(formatRelative("2026-10-14T11:59:30.000Z")).toBe("just now");
    expect(formatRelative("2026-10-14T11:30:00.000Z")).toBe("30 min ago");
    expect(formatRelative("2026-10-13T08:00:00.000Z")).toBe("Yesterday");
  });

  it("never renders an Invalid Date string", () => {
    freeze();
    expect(formatListTime("garbage")).toBe("");
    expect(formatRelative(null)).toBe("");
  });
});
