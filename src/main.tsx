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
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

// Auto-recover from stale dynamic-import chunks after a redeploy.
// Keep this strictly one-shot per tab: repeated hard reloads look like the
// app is “rebooting” forever when the chunk error persists.
const STALE_RELOAD_KEY = "__stale_chunk_reloaded";
const handleStaleChunk = (message: string) => {
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message)) {
    return;
  }
  try {
    if (sessionStorage.getItem(STALE_RELOAD_KEY) === "1") return;
    sessionStorage.setItem(STALE_RELOAD_KEY, "1");
  } catch {
    // ignore storage errors
  }
  window.location.reload();
};

window.addEventListener("error", (e) => {
  handleStaleChunk(e?.message || "");
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e?.reason;
  const message = typeof reason === "string" ? reason : reason?.message || "";
  handleStaleChunk(message);
});

createRoot(document.getElementById("root")!).render(<App />);
