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

const MINUTE = 60_000;
const DAY = 86_400_000;

/** Parses an API timestamp, rejecting anything unusable instead of rendering "Invalid Date". */
export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
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

/** `14:32` — the clock stamp inside a bubble or a row. */
export function formatClock(iso: string | null | undefined): string {
  const value = parseTimestamp(iso);
  if (!value) return "";
  return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
 * Counts on badges. The cap is the caller's because a rail badge has room for one
 * digit while a conversation row does not: `formatCount(1240)` is "999+",
 * `formatCount(12, 9)` is "9+".
 */
export function formatCount(count: number, max = 99): string {
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count > max) return `${max}+`;
  return String(count);
}
