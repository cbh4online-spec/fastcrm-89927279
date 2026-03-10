import { useState, useCallback, useEffect } from "react";
import type { C2CListingFilters, C2CSavedSearch } from "./useC2CListings";

const STORAGE_KEY = "c2c-saved-searches";
const MAX_SAVED = 20;

function load(): C2CSavedSearch[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persist(items: C2CSavedSearch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<C2CSavedSearch[]>(load);

  useEffect(() => {
    setSavedSearches(load());
  }, []);

  const saveSearch = useCallback((name: string, filters: C2CListingFilters) => {
    const item: C2CSavedSearch = {
      id: crypto.randomUUID(),
      name,
      filters,
      created_at: new Date().toISOString(),
    };
    const updated = [item, ...load().slice(0, MAX_SAVED - 1)];
    persist(updated);
    setSavedSearches(updated);
  }, []);

  const removeSearch = useCallback((id: string) => {
    const updated = load().filter((s) => s.id !== id);
    persist(updated);
    setSavedSearches(updated);
  }, []);

  return { savedSearches, saveSearch, removeSearch };
}
