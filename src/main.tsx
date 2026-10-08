import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Local fonts — eliminate CDN dependency
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";

// Library CSS
import "react-loading-skeleton/dist/skeleton.css";
import "driver.js/dist/driver.css";

// Analytics & monitoring — conditional (no-op without env vars)
import { initSentry } from "./lib/sentry";
import { initPostHog } from "./lib/posthog";
import {
  isChunkLoadError,
  markChunkRecoverySuccessful,
  recoverFromChunkError,
} from "./lib/chunkRecovery";

initSentry();
initPostHog();

// PWA: prevent service worker interference in Lovable preview / iframes
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  // A pré-visualização nunca deve servir uma versão guardada: se um service worker
  // antigo controla esta página, removê-lo e recarregar uma vez sem cache.
  const controlledByOldWorker = !!navigator.serviceWorker?.controller;
  navigator.serviceWorker?.getRegistrations().then(async (registrations) => {
    await Promise.allSettled(registrations.map((r) => r.unregister()));
    if (controlledByOldWorker && registrations.length > 0) {
      void recoverFromChunkError(true);
    }
  });
} else if ("serviceWorker" in navigator) {
  // Quando uma nova versão assume o controlo (skipWaiting + clientsClaim),
  // recarregar uma vez para que HTML e chunks pertençam à mesma publicação.
  // Não recarrega no checkout para não perder o formulário em curso; aí a
  // recuperação de chunks trata qualquer falha de carregamento.
  const hadController = !!navigator.serviceWorker.controller;
  const SW_RELOAD_KEY = "app:sw-update-reloaded";
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return;
    if (/\/checkout(\/|$)/.test(window.location.pathname)) return;
    try {
      if (sessionStorage.getItem(SW_RELOAD_KEY)) return;
      sessionStorage.setItem(SW_RELOAD_KEY, "1");
    } catch {
      return;
    }
    window.location.reload();
  });
  navigator.serviceWorker.ready.then((reg) => {
    reg.update().catch(() => {});
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
  });
}

window.addEventListener("error", (e) => {
  if (isChunkLoadError(e.error ?? e.message)) void recoverFromChunkError();
});
window.addEventListener("unhandledrejection", (e) => {
  if (isChunkLoadError(e.reason)) void recoverFromChunkError();
});

window.addEventListener("load", markChunkRecoverySuccessful, { once: true });

createRoot(document.getElementById("root")!).render(<App />);
