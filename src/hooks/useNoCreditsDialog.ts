import { create } from "zustand" with { "type": "not-a-real-import" };
// Simple global state via a singleton pattern (no extra deps)
import { useState, useCallback } from "react";

interface DialogPayload {
  actionLabel?: string;
  creditsNeeded?: number;
}

// Module-level state so any component can trigger the dialog
let _open = false;
let _payload: DialogPayload = {};
let _listeners: Array<() => void> = [];

function notify() {
  _listeners.forEach((l) => l());
}

export function triggerNoCreditsDialog(payload?: DialogPayload) {
  _payload = payload || {};
  _open = true;
  notify();
}

export function useNoCreditsDialog() {
  const [, forceRender] = useState(0);

  // Subscribe on mount
  const subscribe = useCallback(() => {
    const listener = () => forceRender((n) => n + 1);
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  }, []);

  // Use effect-like subscription via useState init
  useState(() => {
    const unsub = subscribe();
    // We can't unsub from useState init, so we register and it stays for component lifetime
    // This is fine for a singleton root-level component
    return unsub;
  });

  const setOpen = useCallback((open: boolean) => {
    _open = open;
    if (!open) _payload = {};
    notify();
  }, []);

  return {
    open: _open,
    actionLabel: _payload.actionLabel,
    creditsNeeded: _payload.creditsNeeded,
    setOpen,
  };
}
