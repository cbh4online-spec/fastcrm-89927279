import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Captures the browser install prompt and exposes a programmatic
 * `promptInstall()` for an in-app install button.
 *
 * Also detects iOS where the prompt event does not exist; in that case
 * `isIOS` is true and the UI should show manual instructions
 * (Share → Add to Home Screen).
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  const isStandalone = typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari property
      window.navigator.standalone === true);

  const isIOS = typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !("MSStream" in window);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return { outcome: "dismissed" as const };
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice;
  }, [deferred]);

  return {
    canInstall: !!deferred,
    isInstalled: installed || isStandalone,
    isStandalone,
    isIOS,
    promptInstall,
  };
}
