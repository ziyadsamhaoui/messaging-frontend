import { OnlineStatus } from "./types";

const ONLINE_WINDOW_MS = 2 * 60_000;
const AWAY_WINDOW_MS = 15 * 60_000;

export function derivePresence(lastSeen: string | null | undefined): OnlineStatus {
  if (!lastSeen) return "OFFLINE";
  const at = Date.parse(lastSeen);
  if (!Number.isFinite(at)) return "OFFLINE";
  const age = Date.now() - at;
  if (age <= ONLINE_WINDOW_MS) return "ONLINE";
  if (age <= AWAY_WINDOW_MS) return "AWAY";
  return "OFFLINE";
}

export function formatLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return "Last seen a while ago";
  const at = Date.parse(lastSeen);
  if (!Number.isFinite(at)) return "Last seen a while ago";
  const minutes = Math.floor(Math.max(Date.now() - at, 0) / 60_000);
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `Last seen ${days} d ago`;
}

export function presenceLabel(status: OnlineStatus): string {
  if (status === "ONLINE") return "Online";
  if (status === "AWAY") return "Away";
  return "Offline";
}

export const presenceDotClass: Record<OnlineStatus, string> = {
  ONLINE: "bg-[var(--color-sage)]",
  AWAY: "bg-amber-400",
  OFFLINE: "bg-[rgba(164,190,123,0.35)]",
};
