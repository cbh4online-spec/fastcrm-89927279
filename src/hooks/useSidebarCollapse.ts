import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "sidebar-collapsed";
const EVENT = "sidebar-collapsed-change";

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState<boolean>(read);

  useEffect(() => {
    const onSync = () => setCollapsed(read());
    window.addEventListener(EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      window.dispatchEvent(new Event(EVENT));
      return next;
    });
  }, []);

  return { collapsed, toggleCollapse };
}
