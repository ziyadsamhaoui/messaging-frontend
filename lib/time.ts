
const MINUTE = 60_000;
const DAY = 86_400_000;

export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function isPast(value: string | null | undefined): boolean {
  const date = parseTimestamp(value);
  return date !== null && date.getTime() <= Date.now();
}

function calendarDaysApart(from: Date, to: Date): number {
  const startOfFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const startOfTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((startOfTo - startOfFrom) / DAY);
}

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

export function formatClock(iso: string | null | undefined): string {
  const value = parseTimestamp(iso);
  if (!value) return "";
  const hours24 = value.getHours();
  const minutes = String(value.getMinutes()).padStart(2, "0");

  const suffix = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${suffix}`;
}

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

export function formatCalendarDate(iso: string | null | undefined): string {
  const value = parseTimestamp(iso);
  if (!value) return "";
  return value.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

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

export function formatCount(count: number, max = 99): string {
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count > max) return `${max}+`;
  return String(count);
}
