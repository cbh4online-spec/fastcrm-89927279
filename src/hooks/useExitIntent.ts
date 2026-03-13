import { useState, useEffect, useCallback } from "react";

export function useExitIntent(options?: { threshold?: number; cooldownMs?: number }) {
  const [triggered, setTriggered] = useState(false);
  const threshold = options?.threshold ?? 10;
  const cooldownMs = options?.cooldownMs ?? 60000;

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY <= threshold && !triggered) {
      const lastShown = sessionStorage.getItem("exit_intent_last");
      if (lastShown && Date.now() - parseInt(lastShown) < cooldownMs) return;
      setTriggered(true);
      sessionStorage.setItem("exit_intent_last", String(Date.now()));
    }
  }, [triggered, threshold, cooldownMs]);

  useEffect(() => {
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [handleMouseLeave]);

  const reset = useCallback(() => setTriggered(false), []);

  return { triggered, reset };
}
