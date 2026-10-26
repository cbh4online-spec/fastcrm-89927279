/**
 * FastCRM WhatsApp Pro — Service Worker (MV3, v0.4.1)
 *
 * - OPEN_TAB: abre separadores da allowlist (lib/urls.js), incluindo fichas por UUID.
 * - AUTH_STATUS / AUTH_START / AUTH_LOGOUT: OAuth 2.1 + PKCE (lib/oauth-client.js).
 * - LIST_WORKSPACES / CONTACT_LOOKUP: API de leitura (lib/extension-api.js), bloqueada
 *   enquanto API_READY=false ou sem client_id. Token nunca sai do service worker.
 */
import { createHandler } from "./lib/sw-handlers.js";
import { createOAuthClient } from "./lib/oauth-client.js";
import { createExtensionApi } from "./lib/extension-api.js";
import { isTrustedSender, isKnownMessage, sanitizeResponse } from "./lib/messages.js";

const oauth = createOAuthClient({ chromeApi: chrome });
const api = createExtensionApi({ getToken: () => oauth.getAccessTokenForServiceWorker() });
const { handle } = createHandler({ oauth, api, openTab: (url) => chrome.tabs.create({ url }) });

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => console.error("[FastCRM] setPanelBehavior falhou"));

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
    (r) => sendResponse(sanitizeResponse(r, message.type)),
    () => sendResponse({ ok: false, error: "erro_interno" })
  );
  return true;
});
