import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 50;

/**
 * Pilha de undo/redo para o HTML do Builder.
 * O estado "actual" vive fora deste hook (na página); aqui guardamos apenas
 * as pilhas e devolvemos o valor a restaurar.
 */
export function useBuilderHistory() {
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);

  /** Regista o estado anterior antes de uma alteração. */
  const push = useCallback(
    (previous: string) => {
      if (past.current[past.current.length - 1] === previous) return;
      past.current.push(previous);
      if (past.current.length > MAX_HISTORY) past.current.shift();
      future.current = [];
      rerender();
    },
    [rerender],
  );

  /** Limpa o histórico (ex.: ao carregar outro asset). */
  const reset = useCallback(() => {
    past.current = [];
    future.current = [];
    rerender();
  }, [rerender]);

  const undo = useCallback(
    (current: string): string | null => {
      const prev = past.current.pop();
      if (prev === undefined) return null;
      future.current.push(current);
      rerender();
      return prev;
    },
    [rerender],
  );

  const redo = useCallback(
    (current: string): string | null => {
      const next = future.current.pop();
      if (next === undefined) return null;
      past.current.push(current);
      rerender();
      return next;
    },
    [rerender],
  );

  return {
    push,
    undo,
    redo,
    reset,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
