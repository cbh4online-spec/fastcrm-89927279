import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Local fonts — eliminate CDN dependency
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
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
// When Vite rebuilds, hashed chunk filenames change; cached index.js still
// references the old URLs and throws "Failed to fetch dynamically imported module".
// We force a one-time hard reload to fetch the fresh manifest.
const STALE_RELOAD_KEY = "__stale_chunk_reloaded_at";
const handleStaleChunk = (message: string) => {
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message)) {
    return;
  }
  try {
    const last = Number(sessionStorage.getItem(STALE_RELOAD_KEY) || "0");
    if (Date.now() - last < 10_000) return; // avoid reload loops
    sessionStorage.setItem(STALE_RELOAD_KEY, String(Date.now()));
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
