import { supabase } from "./supabase";

const b64ToUint8 = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export const pushSupport = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

/** iOS solo entrega push a PWAs instaladas en el inicio */
export const needsInstallFirst = () => isIOS() && !isStandalone();

export async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export type PushResult = "ok" | "denied" | "unsupported" | "needs_install" | "error";

export async function enablePush(userId: string): Promise<PushResult> {
  if (!pushSupport()) return needsInstallFirst() ? "needs_install" : "unsupported";
  if (needsInstallFirst()) return "needs_install";
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerSW());
    if (!reg) return "error";
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToUint8(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    });
    const json = sub.toJSON();
    await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        user_agent: navigator.userAgent.slice(0, 200),
      },
      { onConflict: "endpoint" },
    );
    return "ok";
  } catch {
    return "error";
  }
}

export async function hasPushSubscription(): Promise<boolean> {
  if (!pushSupport()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}
