import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatCalendarDate,
  formatClock,
  formatCount,
  formatDayLabel,
  formatListTime,
  formatRelative,
  formatUntil,
  isPast,
  isSameDay,
  parseTimestamp,
  setClockFormat,
} from "./time";

const NOW = new Date("2026-10-14T12:00:00.000Z");

function freeze() {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("formatClock", () => {
  const at = (iso: string | null) => formatClock(iso);

  afterEach(() => setClockFormat("12h"));

  it("drops the leading zero in 12-hour form", () => {
    setClockFormat("12h");
    expect(at(new Date(2026, 9, 14, 1, 29).toISOString())).toBe("1:29 AM");
    expect(at(new Date(2026, 9, 14, 13, 5).toISOString())).toBe("1:05 PM");
  });

  it("reads midnight and noon as 12, not 0", () => {
    setClockFormat("12h");
    expect(at(new Date(2026, 9, 14, 0, 15).toISOString())).toBe("12:15 AM");
    expect(at(new Date(2026, 9, 14, 12, 15).toISOString())).toBe("12:15 PM");
  });

  it("pads the hour in 24-hour form", () => {
    setClockFormat("24h");
    expect(at(new Date(2026, 9, 14, 9, 7).toISOString())).toBe("09:07");
    expect(at(new Date(2026, 9, 14, 21, 40).toISOString())).toBe("21:40");
  });

  it("returns an empty string rather than an invalid date", () => {
    expect(at("nonsense")).toBe("");
    expect(at(null)).toBe("");
  });
});

describe("formatCalendarDate", () => {
  it("names the day rather than how long ago it was", () => {
    freeze();
    expect(formatCalendarDate(NOW.toISOString())).not.toBe("Today");
    expect(formatCalendarDate(NOW.toISOString())).toMatch(/2026/);
  });

  it("returns an empty string for an unusable value", () => {
    expect(formatCalendarDate(null)).toBe("");
  });
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

describe("formatUntil and isPast", () => {
  it("describes an instant that is still ahead", () => {
    freeze();
    expect(formatUntil("2026-10-14T12:20:00.000Z")).toBe("in 20 min");
    expect(formatUntil("2026-10-14T18:00:00.000Z")).toBe("in 6 h");
    expect(formatUntil("2026-10-15T12:00:00.000Z")).toBe("in 1 day");
    expect(formatUntil("2026-10-17T12:00:00.000Z")).toBe("in 3 days");
  });

  it("falls back to the past tense once the instant has passed", () => {
    freeze();
    expect(formatUntil("2026-10-14T11:00:00.000Z")).toBe("1 h ago");
    expect(formatUntil("2026-10-14T11:59:30.000Z")).toBe("just now");
  });

  it("answers whether a timestamp is behind us, and refuses unusable input", () => {
    freeze();
    expect(isPast("2026-10-14T11:59:00.000Z")).toBe(true);
    expect(isPast("2026-10-14T12:01:00.000Z")).toBe(false);
    expect(isPast("garbage")).toBe(false);
    expect(isPast(null)).toBe(false);
  });
});
