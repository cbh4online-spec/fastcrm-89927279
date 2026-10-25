/**
 * FastCRM WhatsApp Pro — Service Worker (MV3, v0.3.0)
 *
 * Única ação: abrir separadores para URLs da allowlist (lib/urls.js),
 * a pedido do próprio painel lateral. Sem fetch, sem cookies, sem content scripts.
 */
import { isAllowedUrl } from "./lib/urls.js";

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("[FastCRM] setPanelBehavior falhou:", error));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Só mensagens da própria extensão (painel), nunca de páginas web.
  if (sender.id !== chrome.runtime.id || sender.tab) {
    sendResponse({ ok: false, error: "Remetente não autorizado" });
    return false;
  }
  if (!message || message.type !== "OPEN_TAB" || typeof message.url !== "string") {
    sendResponse({ ok: false, error: "Mensagem inválida" });
    return false;
  }
  if (!isAllowedUrl(message.url)) {
    sendResponse({ ok: false, error: "Destino fora da lista permitida" });
    return false;
  }
  chrome.tabs.create({ url: message.url }).then(
    () => sendResponse({ ok: true }),
    (error) => sendResponse({ ok: false, error: String(error) })
  );
  return true;
});
