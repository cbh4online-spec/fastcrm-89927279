import { useState, useCallback, useEffect } from "react";

interface DialogPayload {
  actionLabel?: string;
  creditsNeeded?: number;
}

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

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  }, []);

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
