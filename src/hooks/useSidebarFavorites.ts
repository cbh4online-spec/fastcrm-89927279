import { useState, useCallback, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const MAX_FAVORITES = 8;

function getStorageKey(workspaceId: string) {
  return `sidebar-favorites-${workspaceId}`;
}

export function useSidebarFavorites() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? "default";

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(workspaceId));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync when workspace changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(workspaceId));
      setFavorites(stored ? JSON.parse(stored) : []);
    } catch {
      setFavorites([]);
    }
  }, [workspaceId]);

  const persist = useCallback(
    (next: string[]) => {
      setFavorites(next);
      localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(next));
    },
    [workspaceId]
  );

  const toggleFavorite = useCallback(
    (href: string) => {
      setFavorites((prev) => {
        const next = prev.includes(href)
          ? prev.filter((h) => h !== href)
          : prev.length < MAX_FAVORITES
          ? [...prev, href]
          : prev;
        localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(next));
        return next;
      });
    },
    [workspaceId]
  );

  const isFavorite = useCallback(
    (href: string) => favorites.includes(href),
    [favorites]
  );

  return { favorites, toggleFavorite, isFavorite };
}
