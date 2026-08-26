import { useCallback, useEffect, useState } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return !!el.closest?.('[contenteditable="true"]');
}

/**
 * Atalho global de ajuda: `?` (Shift+/) abre o modal de atalhos de teclado.
 * Ignorado quando o foco está num campo de texto ou quando já existe um
 * diálogo/popover modal aberto (evita conflitos com formulários).
 */
export function useGlobalShortcutsHelp() {
  const [open, setOpen] = useState(false);

  const openHelp = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "?" && !(e.key === "/" && e.shiftKey)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (open) return;
      // Não interferir com diálogos modais já abertos
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return { open, setOpen, openHelp };
}
