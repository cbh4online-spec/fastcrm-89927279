/**
 * FastCRM WhatsApp Pro — Service Worker (Manifest V3)
 *
 * Responsabilidades nesta iteração (prova de conceito):
 *  - Abrir o painel lateral quando o utilizador clica no ícone da extensão.
 *  - Abrir separadores https a pedido do painel.
 *
 * Deliberadamente NÃO faz:
 *  - Nenhum content script (nada é injetado em páginas).
 *  - Nenhuma leitura de cookies, tokens ou sessões.
 *  - Nenhuma automação de DOM no WhatsApp Web.
 *  - Nenhum envio automático de mensagens.
 *  - Nenhum fetch cross-origin (sem host_permissions, por decisão).
 */

// Abrir o side panel ao clicar no ícone da toolbar.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("[FastCRM] setPanelBehavior falhou:", error));

// Mensagens vindas do side panel.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPEN_TAB" && typeof message.url === "string") {
    const url = message.url;
    // Só permitimos abrir URLs https — nunca javascript:, data:, file:, etc.
    if (/^https:\/\//i.test(url)) {
      chrome.tabs.create({ url }).then(
        () => sendResponse({ ok: true }),
        (error) => sendResponse({ ok: false, error: String(error) })
      );
    } else {
      sendResponse({ ok: false, error: "URL não permitido (apenas https://)" });
    }
    return true; // resposta assíncrona
  }
  return false;
});
