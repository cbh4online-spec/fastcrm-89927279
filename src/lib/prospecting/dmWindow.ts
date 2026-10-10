import { toast } from "sonner";

/**
 * Abertura de DM resistente a bloqueadores de pop-ups.
 * A janela é reservada de forma síncrona no clique (about:blank, sem navegar) e
 * só é encaminhada para a DM depois das verificações assíncronas. Se o browser
 * bloquear, nada é marcado como aberto: o utilizador recebe um botão explícito
 * e só esse clique bem-sucedido ativa «Já enviei».
 */
export const DM_POPUP_BLOCKED_MESSAGE =
  "O browser bloqueou a nova janela. Use o botão «Abrir conversa» ou permita pop-ups para este site.";

export function reserveDmWindow(): Window | null {
  try {
    const win = window.open("about:blank", "_blank");
    if (win) {
      try { win.opener = null; } catch { /* ignore */ }
    }
    return win;
  } catch {
    return null;
  }
}

export function closeDmWindow(win: Window | null | undefined) {
  try { if (win && !win.closed) win.close(); } catch { /* ignore */ }
}

function navigate(win: Window | null | undefined, url: string): boolean {
  if (!win || win.closed) return false;
  try {
    win.location.replace(url);
    return true;
  } catch {
    return false;
  }
}

/** Abre diretamente (deve ser chamado num clique do utilizador). */
export function openDmDirect(url: string): boolean {
  try {
    const win = window.open(url, "_blank");
    if (!win) return false;
    try { win.opener = null; } catch { /* ignore */ }
    return true;
  } catch {
    return false;
  }
}

/**
 * Encaminha a janela reservada para a DM. Devolve true se abriu; caso contrário
 * mostra instrução com botão manual e chama `onOpened` só se esse clique abrir.
 */
export function finishDmOpen(win: Window | null | undefined, url: string, onOpened: () => void): boolean {
  if (navigate(win, url)) {
    onOpened();
    return true;
  }
  closeDmWindow(win);
  toast.warning("A conversa não abriu", {
    description: `${DM_POPUP_BLOCKED_MESSAGE} Ligação: ${url}`,
    duration: 20000,
    action: {
      label: "Abrir conversa",
      onClick: () => {
        if (openDmDirect(url)) onOpened();
        else toast.error("O browser voltou a bloquear a janela", { description: `Abra manualmente: ${url}` });
      },
    },
  });
  return false;
}
