import { useState, useCallback, useRef, useEffect } from "react";
import { useUpdateEbook, type Ebook, type EbookChapter, type EbookContactPage } from "@/hooks/useEbooks";
import type { SaveStatus } from "@/components/ebooks/editor/EbookStatusBar";

interface PendingUpdate {
  chapters?: EbookChapter[];
  header_text?: string;
  footer_text?: string;
  contact_page?: EbookContactPage;
  theme?: string;
  global_styles?: Record<string, unknown>;
  lead_gate_enabled?: boolean;
  protection_enabled?: boolean;
  [key: string]: unknown;
}

interface UseEbookPersistenceOptions {
  ebookId: string;
  debounceMs?: number;
}

export function useEbookPersistence({ ebookId, debounceMs = 1500 }: UseEbookPersistenceOptions) {
  const updateEbook = useUpdateEbook();
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const pendingRef = useRef<PendingUpdate>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);

  // Recovery key
  const recoveryKey = `ebook:${ebookId}:draft`;

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Flush pending updates to server
  const flush = useCallback(async () => {
    const updates = { ...pendingRef.current };
    if (Object.keys(updates).length === 0) return;

    // Clear pending before saving so new changes accumulate fresh
    pendingRef.current = {};
    savingRef.current = true;
    if (mountedRef.current) setSaveStatus("saving");

    try {
      await updateEbook.mutateAsync({ id: ebookId, ...updates } as any);
      if (mountedRef.current) {
        setSaveStatus("saved");
        setLastSavedAt(new Date());
        setIsDirty(false);
        // Clear recovery on success
        try { localStorage.removeItem(recoveryKey); } catch {}
      }
    } catch (err) {
      if (mountedRef.current) {
        setSaveStatus("failed");
        // Save to localStorage for recovery
        try {
          localStorage.setItem(recoveryKey, JSON.stringify(updates));
        } catch {}
      }
    } finally {
      savingRef.current = false;
      // If new changes arrived while saving, schedule another flush
      if (Object.keys(pendingRef.current).length > 0 && mountedRef.current) {
        scheduleFlush();
      }
    }
  }, [ebookId, updateEbook, recoveryKey]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      flush();
    }, debounceMs);
  }, [flush, debounceMs]);

  // Queue a partial update — merges with pending and schedules debounced save
  const queueSave = useCallback((partial: PendingUpdate) => {
    pendingRef.current = { ...pendingRef.current, ...partial };
    setIsDirty(true);
    setSaveStatus("idle");
    scheduleFlush();
  }, [scheduleFlush]);

  // Force immediate save
  const forceSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    flush();
  }, [flush]);

  // Retry last failed save
  const retrySave = useCallback(() => {
    if (saveStatus === "failed") {
      // Try to recover from localStorage
      try {
        const stored = localStorage.getItem(recoveryKey);
        if (stored) {
          const recovered = JSON.parse(stored);
          pendingRef.current = { ...recovered, ...pendingRef.current };
        }
      } catch {}
      flush();
    }
  }, [saveStatus, flush, recoveryKey]);

  // Check for recovery data on mount
  const hasRecovery = useCallback((): boolean => {
    try {
      return !!localStorage.getItem(recoveryKey);
    } catch {
      return false;
    }
  }, [recoveryKey]);

  const recoverDraft = useCallback((): PendingUpdate | null => {
    try {
      const stored = localStorage.getItem(recoveryKey);
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  }, [recoveryKey]);

  const discardRecovery = useCallback(() => {
    try { localStorage.removeItem(recoveryKey); } catch {}
  }, [recoveryKey]);

  return {
    isDirty,
    saveStatus,
    lastSavedAt,
    queueSave,
    forceSave,
    retrySave,
    hasRecovery,
    recoverDraft,
    discardRecovery,
  };
}
