// LeadChef Push subscription helpers.
// VAPID public key is safe to expose client-side.
export const LEADCHEF_VAPID_PUBLIC_KEY =
  "BIXhg9UEh_Q9kd9RZxkU_3sJz98iBjBoInHHqPcx4fdLT2OPTdhvFviPCQAcZSXbBJWvzelOj7DifptA8MaXAQ4";

const SW_PATH = "/leadchef-sw.js";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  // Block on Lovable preview iframes — push is irrelevant there.
  const isPreviewHost =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com");
  let inIframe = false;
  try { inIframe = window.self !== window.top; } catch { inIframe = true; }
  if (isPreviewHost || inIframe) return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

function bufferToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function ensurePushPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

export async function registerLeadChefSW(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  await navigator.serviceWorker.ready;
  return reg;
}

export async function subscribeToPush(reg: ServiceWorkerRegistration) {
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(LEADCHEF_VAPID_PUBLIC_KEY) as unknown as BufferSource,
    });
  }
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? bufferToBase64(sub.getKey("p256dh")),
    auth: json.keys?.auth ?? bufferToBase64(sub.getKey("auth")),
  };
}

export async function unsubscribeFromPush(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
