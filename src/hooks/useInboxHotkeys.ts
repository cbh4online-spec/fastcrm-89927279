import { useEffect, useCallback } from "react";

export interface InboxHotkeyActions {
  onCompose?: () => void;
  onNextConversation?: () => void;
  onPrevConversation?: () => void;
  onResolve?: () => void;
  onReply?: () => void;
  onFollowUp?: () => void;
  onArchive?: () => void;
  onToggleCRMPanel?: () => void;
  onToggleSidebar?: () => void;
  onShowShortcuts?: () => void;
}

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useInboxHotkeys(actions: InboxHotkeyActions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Allow Cmd+Enter everywhere (send)
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") return;

      // Don't intercept when typing in inputs (except ?)
      if (isInputFocused() && e.key !== "?") return;

      // Don't intercept with modifier keys (except shortcuts modal)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "c":
          e.preventDefault();
          actions.onCompose?.();
          break;
        case "j":
          e.preventDefault();
          actions.onNextConversation?.();
          break;
        case "k":
          e.preventDefault();
          actions.onPrevConversation?.();
          break;
        case "e":
          e.preventDefault();
          actions.onResolve?.();
          break;
        case "r":
          e.preventDefault();
          actions.onReply?.();
          break;
        case "f":
          e.preventDefault();
          actions.onFollowUp?.();
          break;
        case "#":
          e.preventDefault();
          actions.onArchive?.();
          break;
        case "p":
          e.preventDefault();
          actions.onToggleCRMPanel?.();
          break;
        case "[":
          e.preventDefault();
          actions.onToggleSidebar?.();
          break;
        case "?":
          e.preventDefault();
          actions.onShowShortcuts?.();
          break;
      }
    },
    [actions]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
