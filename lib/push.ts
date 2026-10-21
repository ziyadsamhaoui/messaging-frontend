import { apiClient } from "./apiClient";
import { VAPID_PUBLIC_KEY } from "./env";

export type PushSubscribeResult = { ok: true } | { ok: false; reason: string };

export type PushState = "unsupported" | "blocked" | "not-enabled" | "enabled";

const PUSH_RECORD_KEY = "badrlink.push.record";

interface PushRecord {
  endpoint: string;
  subscriptionId: string | null;
  registeredAt: number;
}

export function readPushRecord(): PushRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PUSH_RECORD_KEY);
    return raw ? (JSON.parse(raw) as PushRecord) : null;
  } catch {
    return null;
  }
}

function writePushRecord(record: PushRecord | null) {
  if (typeof window === "undefined") return;
  try {
    if (record) window.localStorage.setItem(PUSH_RECORD_KEY, JSON.stringify(record));
    else window.localStorage.removeItem(PUSH_RECORD_KEY);
  } catch {
    void 0;
  }
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isSecureContextForPush(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext;
}

export function pushBlockingReason(): string | null {
  if (!isSecureContextForPush()) {
    return "This page is not served over HTTPS, and browsers only allow push on a secure origin.";
  }
  if (!isPushSupported()) {
    return "This browser does not expose the Service Worker, Push or Notification APIs.";
  }
  return null;
}

export function validateVapidKey(key: string): { ok: true; bytes: Uint8Array<ArrayBuffer> } | { ok: false; reason: string } {
  const trimmed = key.trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: "No VAPID public key is configured for this deployment (NEXT_PUBLIC_VAPID_PUBLIC_KEY).",
    };
  }
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = urlBase64ToUint8Array(trimmed);
  } catch {
    return { ok: false, reason: "The configured VAPID public key is not valid base64url." };
  }
  if (bytes.length !== 65 || bytes[0] !== 0x04) {
    return {
      ok: false,
      reason: `The configured VAPID public key is not a 65-byte uncompressed P-256 point (it decodes to ${bytes.length} bytes starting 0x${bytes[0]?.toString(16) ?? "00"}). The deployment's key pair is misconfigured.`,
    };
  }
  return { ok: true, bytes };
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

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export async function readPushState(): Promise<{
  state: PushState;
  permission: NotificationPermission | "unsupported";
  hasSubscription: boolean;
  endpoint: string | null;
}> {
  if (pushBlockingReason()) {
    return {
      state: isPushSupported() ? "unsupported" : "unsupported",
      permission: "unsupported",
      hasSubscription: false,
      endpoint: null,
    };
  }
  const permission = Notification.permission;
  const registration =
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.getRegistration());
  const subscription = registration ? await registration.pushManager.getSubscription() : null;

  if (permission === "denied") {
    return { state: "blocked", permission, hasSubscription: Boolean(subscription), endpoint: subscription?.endpoint ?? null };
  }
  if (subscription && permission === "granted") {
    return { state: "enabled", permission, hasSubscription: true, endpoint: subscription.endpoint };
  }
  return {
    state: "not-enabled",
    permission,
    hasSubscription: Boolean(subscription),
    endpoint: subscription?.endpoint ?? null,
  };
}

export async function enablePush(): Promise<PushSubscribeResult> {
  const blocking = pushBlockingReason();
  if (blocking) return { ok: false, reason: blocking };

  const key = validateVapidKey(VAPID_PUBLIC_KEY);
  if (!key.ok) return { ok: false, reason: key.reason };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      reason:
        permission === "denied"
          ? "Notifications are blocked for this site. Re-enable them in the browser's site settings."
          : "Notification permission was not granted.",
    };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { ok: false, reason: "The notification service worker could not be registered." };
  }

  try {
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.bytes,
      }));

    const registered = await sendSubscriptionToServer(subscription);
    return registered;
  } catch (error) {
    return { ok: false, reason: pushErrorMessage(error) };
  }
}

function pushErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "The push subscription could not be created.";
}

async function sendSubscriptionToServer(subscription: PushSubscription): Promise<PushSubscribeResult> {
  const serialized = subscription.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  const endpoint = serialized.endpoint ?? "";
  const p256dh = serialized.keys?.p256dh ?? "";
  const auth = serialized.keys?.auth ?? "";
  if (!endpoint || !p256dh || !auth) {
    return { ok: false, reason: "The push subscription is incomplete (no endpoint or keys)." };
  }

  try {
    const response = await apiClient.post<{ id: string }>("/notifications/subscriptions", {
      endpoint,
      keys: { p256dh, auth },
    });
    writePushRecord({ endpoint, subscriptionId: response?.id ?? null, registeredAt: Date.now() });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: `The subscription could not be registered with the server: ${pushErrorMessage(error)}` };
  }
}

export async function disablePush(): Promise<PushSubscribeResult> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, reason: "Push is not available in this browser." };
  }
  const registration =
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.getRegistration());
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  const record = readPushRecord();

  try {
    if (subscription) await subscription.unsubscribe();
  } catch {
  }

  if (record?.subscriptionId) {
    try {
      await apiClient.delete<void>(`/notifications/subscriptions/${record.subscriptionId}`);
    } catch {
    }
  }
  writePushRecord(null);
  return { ok: true };
}

export async function syncPushSubscription(): Promise<boolean> {
  if (pushBlockingReason() || Notification.permission !== "granted") return false;
  try {
    const registration = await registerServiceWorker();
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    if (!subscription) return false;
    const result = await sendSubscriptionToServer(subscription);
    return result.ok;
  } catch {
    return false;
  }
}

export async function showTestNotification(): Promise<PushSubscribeResult> {
  const blocking = pushBlockingReason();
  if (blocking) return { ok: false, reason: blocking };
  if (Notification.permission !== "granted") {
    return { ok: false, reason: "Notification permission has not been granted yet." };
  }
  const registration =
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.getRegistration());
  if (!registration) {
    return { ok: false, reason: "No service worker is registered for this page." };
  }
  try {
    await registration.showNotification("BadrLink test notification", {
      body: "If you can read this on your device, push is working here.",
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: "badrlink-test",
      data: { url: "/app/notifications" },
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: pushErrorMessage(error) };
  }
}

export interface PushDiagnostic {
  label: string;
  ok: boolean;
  detail: string;
}

export async function collectPushDiagnostics(): Promise<PushDiagnostic[]> {
  const blocking = pushBlockingReason();
  const key = validateVapidKey(VAPID_PUBLIC_KEY);
  const supported = isPushSupported();
  const permission = supported ? Notification.permission : ("unsupported" as const);

  let workerState = "not registered";
  let hasSubscription = false;
  let endpoint: string | null = null;
  if (supported && isSecureContextForPush()) {
    try {
      const registration =
        (await navigator.serviceWorker.getRegistration("/")) ??
        (await navigator.serviceWorker.getRegistration());
      workerState = registration
        ? registration.active
          ? "active"
          : registration.installing
            ? "installing"
            : "waiting"
        : "not registered";
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      hasSubscription = Boolean(subscription);
      endpoint = subscription?.endpoint ?? null;
    } catch {
      workerState = "unavailable";
    }
  }

  const record = readPushRecord();
  const serverKnows = Boolean(record && endpoint && record.endpoint === endpoint);

  return [
    {
      label: "Secure origin",
      ok: isSecureContextForPush(),
      detail: isSecureContextForPush()
        ? "The page is served over HTTPS or on localhost."
        : "Push needs HTTPS (localhost is treated as secure).",
    },
    {
      label: "Browser support",
      ok: supported,
      detail: supported
        ? "Service Worker, Push and Notification APIs are present."
        : "This browser does not expose the APIs push needs.",
    },
    {
      label: "VAPID public key",
      ok: key.ok,
      detail: key.ok
        ? "The key decodes to a 65-byte uncompressed P-256 point."
        : key.reason,
    },
    {
      label: "Notification permission",
      ok: permission === "granted",
      detail:
        permission === "granted"
          ? "Granted."
          : permission === "denied"
            ? "Denied for this site."
            : permission === "default"
              ? "Not asked yet."
              : "Not supported.",
    },
    {
      label: "Service worker",
      ok: workerState === "active",
      detail:
        workerState === "active"
          ? "Registered at / and activated."
          : `State: ${workerState}.`,
    },
    {
      label: "Push subscription",
      ok: hasSubscription,
      detail: hasSubscription
        ? "This browser holds a push subscription."
        : "No subscription on this browser yet.",
    },
    {
      label: "Registered with the server",
      ok: serverKnows,
      detail: serverKnows
        ? "This endpoint was accepted by the notification service."
        : record && !endpoint
          ? "A previous registration is on record, but this browser no longer holds a matching subscription."
          : "This browser's subscription has not been sent to the server.",
    },
    {
      label: "Deployment note",
      ok: !blocking,
      detail: blocking ?? "Nothing about this page blocks push.",
    },
  ];
}
