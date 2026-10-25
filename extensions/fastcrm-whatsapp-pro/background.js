/**
 * FastCRM WhatsApp Pro — Service Worker (MV3, v0.4.0)
 *
 * - OPEN_TAB: abre separadores da allowlist (lib/urls.js), incluindo fichas por UUID.
 * - AUTH_STATUS / AUTH_START / AUTH_LOGOUT: OAuth 2.1 + PKCE (lib/oauth-client.js).
 * - LIST_WORKSPACES / CONTACT_LOOKUP: API de leitura (lib/extension-api.js), bloqueada
 *   enquanto API_READY=false ou sem client_id. Token nunca sai do service worker.
 */
import { isAllowedUrl } from "./lib/urls.js";
import { createOAuthClient } from "./lib/oauth-client.js";
import { createExtensionApi } from "./lib/extension-api.js";
import { isTrustedSender, isKnownMessage, sanitizeResponse } from "./lib/messages.js";

const oauth = createOAuthClient({ chromeApi: chrome });
const api = createExtensionApi({ getToken: () => oauth.getAccessTokenForServiceWorker() });
/** Workspaces devolvidos pela API nesta sessão do SW (só memória). */
let allowedWorkspaces = new Set();

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
      allowedWorkspaces = new Set();
      return { ok: true, status: await oauth.logout() };
    case "LIST_WORKSPACES": {
      const r = await api.listWorkspaces();
      allowedWorkspaces = new Set(r.ok ? r.workspaces.map((w) => w.id) : []);
      if (r.error === "sessao_expirada") await oauth.logout();
      return r;
    }
    case "CONTACT_LOOKUP": {
      const r = await api.lookup(message.workspaceId, message.phone, allowedWorkspaces);
      if (r.error === "sessao_expirada") { allowedWorkspaces = new Set(); await oauth.logout(); }
      return r;
    }
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
    (r) => sendResponse(sanitizeResponse(r, message.type)),
    () => sendResponse({ ok: false, error: "erro_interno" })
  );
  return true;
});
