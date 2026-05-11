import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ROUTE_MANIFEST } from "@/config/routeManifest";

const STORAGE_KEY = "watidy_sidebar_recents";
const EVENT = "watidy-recents-change";
const MAX_RECENTS = 5;

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Tracks the last MAX_RECENTS routes visited, identified by RouteEntry.key */
export function useSidebarRecents() {
  const location = useLocation();
  const [recents, setRecents] = useState<string[]>(read);

  // Track route changes
  useEffect(() => {
    const path = location.pathname;
    const search = location.search;
    // Find matching route entry
    const match = ROUTE_MANIFEST.find((r) => {
      const [base, qs] = r.href.split("?");
      if (qs) return path === base && search === `?${qs}`;
      if (r.end || base === "/dashboard") return path === base;
      return path === base || path.startsWith(base + "/");
    });
    if (!match) return;
    const current = read();
    const next = [match.key, ...current.filter((k) => k !== match.key)].slice(0, MAX_RECENTS);
    if (JSON.stringify(next) !== JSON.stringify(current)) {
      write(next);
      setRecents(next);
    }
  }, [location.pathname, location.search]);

  // Sync across tabs/instances
  useEffect(() => {
    const sync = () => setRecents(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { recents, max: MAX_RECENTS };
}
