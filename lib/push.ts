import { apiClient } from "./apiClient";
import { VAPID_PUBLIC_KEY } from "./env";

export type PushSubscribeResult =
  | { ok: true }
  | { ok: false; reason: string };

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

export async function subscribeToPush(): Promise<PushSubscribeResult> {
  if (!isPushSupported()) {
    return { ok: false, reason: "Push notifications are not supported in this browser." };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, reason: "Push is not configured on this deployment (missing VAPID key)." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Notification permission was not granted." };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { ok: false, reason: "The notification service worker could not be registered." };
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const serialized = subscription.toJSON();
  const endpoint = typeof serialized.endpoint === "string" ? serialized.endpoint : "";
  const keys = (serialized.keys ?? {}) as { p256dh?: string; auth?: string };
  if (!endpoint || !keys.p256dh || !keys.auth) {
    return { ok: false, reason: "The push subscription is incomplete." };
  }

  await apiClient.post("/notifications/subscriptions", {
    endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  });
  return { ok: true };
}
