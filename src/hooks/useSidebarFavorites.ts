import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "watidy_sidebar_favorites";
const EVENT = "watidy-favorites-change";
const MAX_FAVORITES = 6;

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

export function useSidebarFavorites() {
  const [favorites, setFavorites] = useState<string[]>(read);

  useEffect(() => {
    const sync = () => setFavorites(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isFavorite = useCallback((key: string) => favorites.includes(key), [favorites]);

  const toggleFavorite = useCallback((key: string) => {
    const current = read();
    let next: string[];
    if (current.includes(key)) {
      next = current.filter((k) => k !== key);
    } else {
      next = [key, ...current.filter((k) => k !== key)].slice(0, MAX_FAVORITES);
    }
    write(next);
    setFavorites(next);
  }, []);

  return { favorites, isFavorite, toggleFavorite, max: MAX_FAVORITES };
}
