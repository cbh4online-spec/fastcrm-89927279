const CHUNK_RECOVERY_KEY = "app:chunk-recovery-attempted";
const RECOVERY_QUERY_KEY = "app-refresh";
/** Tempo máximo de espera pela limpeza do service worker/caches antes de recarregar. */
export const RECOVERY_STEP_TIMEOUT_MS = 3000;

export const isChunkLoadError = (error: unknown): boolean => {
  const message =
    (typeof error === "string" ? error : (error as Error | undefined)?.message) ?? "";

  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    message,
  );
};

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<void>((resolve) => setTimeout(resolve, ms))]);

const clearApplicationCaches = async () => {
  if (!("caches" in window)) return;

  const cacheNames = await window.caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => /workbox|precache|vite|fastcrm/i.test(name))
      .map((name) => window.caches.delete(name)),
  );
};

const unregisterServiceWorkers = async () => {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
};

const reloadWithCacheBypass = () => {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set(RECOVERY_QUERY_KEY, Date.now().toString());
  window.location.replace(nextUrl.toString());
};

let recoveryInFlight: Promise<boolean> | null = null;

export async function recoverFromChunkError(force = false): Promise<boolean> {
  // Várias fontes (boundary, window error, unhandledrejection) podem pedir
  // recuperação ao mesmo tempo: partilhar a mesma tentativa.
  if (recoveryInFlight) return recoveryInFlight;

  try {
    if (!force && sessionStorage.getItem(CHUNK_RECOVERY_KEY)) return false;
    sessionStorage.setItem(CHUNK_RECOVERY_KEY, "1");
  } catch {
    if (!force) return false;
  }

  recoveryInFlight = (async () => {
    // Nunca ficar preso: se o browser não responder, recarrega na mesma.
    await withTimeout(
      Promise.allSettled([unregisterServiceWorkers(), clearApplicationCaches()]),
      RECOVERY_STEP_TIMEOUT_MS,
    );
    reloadWithCacheBypass();
    return true;
  })();
  return recoveryInFlight;
}

export function markChunkRecoverySuccessful() {
  const currentUrl = new URL(window.location.href);
  const recovered = currentUrl.searchParams.has(RECOVERY_QUERY_KEY);

  if (recovered) {
    currentUrl.searchParams.delete(RECOVERY_QUERY_KEY);
    window.history.replaceState(window.history.state, "", currentUrl.toString());
  }

  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
    } catch {
      // Storage may be unavailable in privacy-restricted browsers.
    }
  }, 10_000);
}
