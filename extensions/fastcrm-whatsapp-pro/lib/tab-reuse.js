/**
 * Reutilização do separador do WhatsApp Web (v0.8.0).
 * Quando o FastCRM abre um novo separador web.whatsapp.com/send, e já existe outro separador
 * do WhatsApp Web, fecha o novo e abre a conversa no separador existente.
 * Nunca envia mensagens: só abre a conversa (o texto fica pré-preenchido para o utilizador).
 */
export const WA_PREFIX = "https://web.whatsapp.com/";

export function isSendUrl(url) {
  try {
    const u = new URL(url);
    return u.origin === "https://web.whatsapp.com" && u.pathname === "/send" && /^\d{8,15}$/.test(u.searchParams.get("phone") || "");
  } catch { return false; }
}

/** Escolhe o separador WhatsApp Web a manter (o mais antigo que não seja o novo). */
export function pickExistingTab(tabs, newTabId) {
  return tabs.filter((t) => t.id !== newTabId && typeof t.url === "string" && t.url.startsWith(WA_PREFIX))
    .sort((a, b) => a.id - b.id)[0] || null;
}

export function createTabReuser(chromeApi) {
  const handled = new Set();
  return async function onTab(tabId, url) {
    if (!isSendUrl(url) || handled.has(tabId)) return false;
    handled.add(tabId);
    setTimeout(() => handled.delete(tabId), 10_000);
    let tabs = [];
    try { tabs = await chromeApi.tabs.query({ url: `${WA_PREFIX}*` }); } catch { return false; }
    const existing = pickExistingTab(tabs, tabId);
    if (!existing) return false;
    handled.add(existing.id);
    setTimeout(() => handled.delete(existing.id), 10_000);
    await chromeApi.tabs.update(existing.id, { url, active: true });
    try { await chromeApi.windows.update(existing.windowId, { focused: true }); } catch { /* opcional */ }
    try { await chromeApi.tabs.remove(tabId); } catch { /* já fechado */ }
    return true;
  };
}
