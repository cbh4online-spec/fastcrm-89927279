import { useEffect, useState, Dispatch, SetStateAction } from "react";
import { safeStorageGet, safeStorageSet } from "@/lib/browser/safeBrowser";

/** Estado que fica guardado neste navegador (última seleção do utilizador). */
export function usePersistedState<T>(key: string, initial: T, sanitize?: (v: T) => T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const raw = safeStorageGet("local", key);
    if (raw == null) return initial;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      safeStorageSet("local", key, JSON.stringify(sanitize ? sanitize(value) : value));
    } catch {
      /* ignore */
    }
  }, [key, value, sanitize]);
  return [value, setValue];
}
