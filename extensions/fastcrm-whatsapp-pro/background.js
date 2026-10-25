/**
 * FastCRM WhatsApp Pro — Service Worker (MV3, v0.4.0)
 *
 * - OPEN_TAB: abre separadores da allowlist (lib/urls.js).
 * - AUTH_STATUS / AUTH_START / AUTH_LOGOUT: OAuth 2.1 + PKCE (lib/oauth-client.js).
 * - CONTACT_LOOKUP: recusado até existir a API read-only (v0.4B).
 * Respostas nunca incluem tokens. Sem content scripts, sem cookies.
 */
import { isAllowedUrl } from "./lib/urls.js";
import { createOAuthClient } from "./lib/oauth-client.js";
import { isTrustedSender, isKnownMessage, sanitizeResponse } from "./lib/messages.js";

const oauth = createOAuthClient({ chromeApi: chrome });

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => console.error("[FastCRM] setPanelBehavior falhou"));

async function handle(message) {
  switch (message.type) {
    case "OPEN_TAB":
      if (typeof message.url !== "string" || !isAllowedUrl(message.url)) return { ok: false, error: "Destino fora da lista permitida" };
      await chrome.tabs.create({ url: message.url });
      return { ok: true };
    case "AUTH_STATUS":
      return { ok: true, status: await oauth.status() };
    case "AUTH_START": {
      const r = await oauth.start();
      return { ok: r.status === "connected", status: r.status, error: r.error };
    }
    case "AUTH_LOGOUT":
      return { ok: true, status: await oauth.logout() };
    case "CONTACT_LOOKUP":
      return { ok: false, error: "api_indisponivel" };
    default:
      return { ok: false, error: "Mensagem inválida" };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isTrustedSender(sender, chrome.runtime.id)) {
    sendResponse({ ok: false, error: "Remetente não autorizado" });
    return false;
  }
  if (!isKnownMessage(message)) {
    sendResponse({ ok: false, error: "Mensagem inválida" });
    return false;
  }
  handle(message).then(
    (r) => sendResponse(sanitizeResponse(r)),
    () => sendResponse({ ok: false, error: "erro_interno" })
  );
  return true;
});
