import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY_PREFIX = "store-recently-viewed-";
const MAX_ITEMS = 10;

export interface RecentlyViewedItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  viewedAt: number;
}

export function useRecentlyViewed(workspaceId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${workspaceId}`;

  const [items, setItems] = useState<RecentlyViewedItem[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addItem = useCallback((item: Omit<RecentlyViewedItem, "viewedAt">) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== item.id);
      const updated = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [storageKey]);

  return { items, addItem };
}
