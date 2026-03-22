import { useState, useCallback, useRef } from "react";

export interface ColumnWidthsState {
  widths: Record<string, number>;
  setWidth: (colId: string, width: number) => void;
  startResize: (colId: string, startX: number) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: () => void;
  isResizing: boolean;
  resetWidths: () => void;
  autoFitColumn: (colId: string, tableRef: React.RefObject<HTMLTableElement | null>) => void;
  autoFitAll: (visibleColIds: string[], tableRef: React.RefObject<HTMLTableElement | null>) => void;
}

const DEFAULT_WIDTH = 100;
const MIN_WIDTH = 60;
const MAX_WIDTH = 600;

export function useColumnWidths(storageKey: string): ColumnWidthsState {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}-widths`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const resizeRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);

  const persist = useCallback((newWidths: Record<string, number>) => {
    try {
      localStorage.setItem(`${storageKey}-widths`, JSON.stringify(newWidths));
    } catch {}
  }, [storageKey]);

  const setWidth = useCallback((colId: string, width: number) => {
    const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
    setWidths(prev => {
      const next = { ...prev, [colId]: clamped };
      persist(next);
      return next;
    });
  }, [persist]);

  const startResize = useCallback((colId: string, startX: number) => {
    const currentWidth = widths[colId] || DEFAULT_WIDTH;
    resizeRef.current = { colId, startX, startWidth: currentWidth };
  }, [widths]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeRef.current) return;
    const { colId, startX, startWidth } = resizeRef.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + diff));
    setWidths(prev => ({ ...prev, [colId]: newWidth }));
  }, []);

  const onMouseUp = useCallback(() => {
    if (resizeRef.current) {
      persist(widths);
      resizeRef.current = null;
    }
  }, [widths, persist]);

  const resetWidths = useCallback(() => {
    setWidths({});
    try { localStorage.removeItem(`${storageKey}-widths`); } catch {}
  }, [storageKey]);

  const autoFitColumn = useCallback((colId: string, tableRef: React.RefObject<HTMLTableElement | null>) => {
    if (!tableRef.current) return;
    const cells = tableRef.current.querySelectorAll(`[data-col-id="${colId}"]`);
    let maxWidth = MIN_WIDTH;
    cells.forEach(cell => {
      const el = cell as HTMLElement;
      // Temporarily remove width constraints to measure natural width
      const prev = el.style.width;
      el.style.width = 'auto';
      el.style.whiteSpace = 'nowrap';
      const natural = el.scrollWidth + 16; // padding
      el.style.width = prev;
      el.style.whiteSpace = '';
      maxWidth = Math.max(maxWidth, Math.min(MAX_WIDTH, natural));
    });
    setWidth(colId, maxWidth);
  }, [setWidth]);

  const autoFitAll = useCallback((visibleColIds: string[], tableRef: React.RefObject<HTMLTableElement | null>) => {
    visibleColIds.forEach(colId => autoFitColumn(colId, tableRef));
  }, [autoFitColumn]);

  return {
    widths,
    setWidth,
    startResize,
    onMouseMove,
    onMouseUp,
    isResizing: !!resizeRef.current,
    resetWidths,
    autoFitColumn,
    autoFitAll,
  };
}
