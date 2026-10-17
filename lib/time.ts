/**
 * One shared time vocabulary for the whole app screen.
 *
 * The UI previously formatted dates in six different places with four different
 * shapes (`toLocaleTimeString`, `toLocaleString`, a raw ISO string and hand-rolled
 * "min ago" strings), so the same moment could read "13:23", "13:23:45" or
 * "10/14/2026, 1:23:45 PM" depending on which surface you were looking at. Every
 * formatter is here instead, and every caller picks one of four shapes:
 *
 *   formatClock     14:32                      inside a message bubble
 *   formatListTime  Wed / Yesterday / 14:32    right column of a conversation row
 *   formatDayLabel  Today / Yesterday / Wednesday / 12 October   date separators
 *   formatRelative  just now / 5 min ago / 3 h ago / Yesterday / 12 Oct
 *
 * Weekday and date forms use the runtime locale, as the previous code did, and are
 * only ever rendered for fetched data, so nothing here is evaluated during the
 * static render of the shell.
 */

import type { TimeFormat } from "./prefs";

const MINUTE = 60_000;
const DAY = 86_400_000;

/**
 * The clock format every formatter in this file uses.
 *
 * It is a module value rather than a parameter because the same moment is rendered
 * by a conversation row, a bubble, a notification and a tooltip, and none of them
 * should have to know where the preference lives. `prefsStore` seeds it at start-up
 * and updates it whenever the setting changes, so every surface switches together.
 */
let clockFormat: TimeFormat = "12h";

export function setClockFormat(format: TimeFormat) {
  clockFormat = format;
}

export function getClockFormat(): TimeFormat {
  return clockFormat;
}

/** Parses an API timestamp, rejecting anything unusable instead of rendering "Invalid Date". */
export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * True when an API timestamp is in the past (an invitation past its TTL, for
 * example). It lives here, beside the parsers, so both the inbox and the invitation
 * detail view apply exactly one expiry rule, and so a component never reads the
 * clock inline.
 */
export function isPast(value: string | null | undefined): boolean {
  const date = parseTimestamp(value);
  return date !== null && date.getTime() <= Date.now();
}

/** Calendar days between two instants, so "yesterday" means the day before and not 24 hours. */
function calendarDaysApart(from: Date, to: Date): number {
  const startOfFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const startOfTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((startOfTo - startOfFrom) / DAY);
}

/** Days elapsed between the given instant and now, measured on the local calendar. */
export function daysSince(value: Date, now = new Date()): number {
  return calendarDaysApart(value, now);
}

export function isSameDay(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = parseTimestamp(left);
  const b = parseTimestamp(right);
  if (!a || !b) return false;
  return calendarDaysApart(a, b) === 0;
}

function isSameYear(value: Date, now = new Date()): boolean {
  return value.getFullYear() === now.getFullYear();
}

/**
 * `1:29 PM` or `13:29` — the clock stamp inside a bubble or a row.
 *
 * Built by hand rather than with `toLocaleTimeString`, which cannot produce a
 * 12-hour clock without a leading zero: with `hour: "2-digit"` it renders "01:29 PM"
 * (the reported bug), and with `hour: "numeric"` it is locale-dependent — some
 * locales still pad. Both fields are formatted as integers and the hour is put on a
 * 12-hour scale explicitly, so "01:29 AM" can no longer appear anywhere.
 */
export function formatClock(iso: string | null | undefined): string {
  const value = parseTimestamp(iso);
  if (!value) return "";
  const hours24 = value.getHours();
  const minutes = String(value.getMinutes()).padStart(2, "0");
  if (clockFormat === "24h") return `${String(hours24).padStart(2, "0")}:${minutes}`;
  const suffix = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${suffix}`;
}

/**
 * The compact right-hand column of a conversation row: the clock while it is still
 * today, then the day, then a date once the day stops being useful.
 */
export function formatListTime(iso: string | null | undefined): string {
  const value = parseTimestamp(iso);
  if (!value) return "";
  const days = daysSince(value);
  if (days <= 0) return formatClock(iso);
  if (days === 1) return "Yesterday";
  if (days < 7) return value.toLocaleDateString([], { weekday: "short" });
  if (isSameYear(value)) return value.toLocaleDateString([], { day: "numeric", month: "short" });
  return value.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

/**
 * A plain calendar date — `Oct 12, 2026`. Used where the moment matters rather than
 * how long ago it was (a group's creation date), so it never reads "Today".
 */
export function formatCalendarDate(iso: string | null | undefined): string {
  const value = parseTimestamp(iso);
  if (!value) return "";
  return value.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

/** The sticky day separator in the message list and the day heading in notifications. */
export function formatDayLabel(iso: string | null | undefined): string {
  const value = parseTimestamp(iso);
  if (!value) return "";
  const days = daysSince(value);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return value.toLocaleDateString([], { weekday: "long" });
  if (isSameYear(value)) return value.toLocaleDateString([], { day: "numeric", month: "long" });
  return value.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Relative time for presence and notification rows. Deliberately coarse: the line
 * answers "how stale is this", and a per-second counter would re-render the whole
 * list for no benefit.
 */
export function formatRelative(iso: string | null | undefined): string {
  const value = parseTimestamp(iso);
  if (!value) return "";
  const minutes = Math.floor(Math.max(Date.now() - value.getTime(), 0) / MINUTE);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (daysSince(value) === 1) return "Yesterday";
  return formatListTime(iso);
}

/**
 * Relative time for an instant that is still ahead (an invitation's expiry).
 *
 * `formatRelative` cannot express this: it measures an elapsed interval from now, so a
 * future timestamp collapses to "just now", which is what an invitation that expires in
 * two days used to read as. This is its mirror, and it degrades to the same calendar
 * words once the value is no longer in the future.
 */
export function formatUntil(iso: string | null | undefined): string {
  const value = parseTimestamp(iso);
  if (!value) return "";
  const milliseconds = value.getTime() - Date.now();
  if (milliseconds <= 0) return formatRelative(iso);
  const minutes = Math.max(Math.round(milliseconds / MINUTE), 1);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "in 1 day" : `in ${days} days`;
}

/**
 * Counts on badges. The cap is the caller's because a rail badge has room for one
 * digit while a conversation row does not: `formatCount(12, 9)` is "9+" and
 * `formatCount(1240)` is "99+" at the 99 default.
 */
export function formatCount(count: number, max = 99): string {
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count > max) return `${max}+`;
  return String(count);
}
