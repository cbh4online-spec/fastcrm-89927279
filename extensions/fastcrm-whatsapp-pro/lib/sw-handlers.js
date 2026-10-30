/**
 * Lógica do service worker isolada para testes. Mantém allowedWorkspaces só em memória
 * e um "epoch" de sessão: qualquer resposta iniciada antes de AUTH_START/AUTH_LOGOUT/401
 * é descartada, para nunca expor resultados de uma sessão anterior.
 */
import { isAllowedUrl } from "./urls.js";

export function createHandler({ oauth, api, openTab }) {
  let allowedWorkspaces = new Set();
  let epoch = 0;
  const resetSession = () => { allowedWorkspaces = new Set(); epoch++; };

  async function handle(message) {
    switch (message.type) {
      case "OPEN_TAB":
        if (typeof message.url !== "string" || !isAllowedUrl(message.url)) return { ok: false, error: "Destino fora da lista permitida" };
        await openTab(message.url);
        return { ok: true };
      case "AUTH_STATUS":
        return { ok: true, status: await oauth.status() };
      case "AUTH_START": {
        resetSession();
        const r = await oauth.start();
        resetSession();
        return { ok: r.status === "connected", status: r.status, error: r.error };
      }
      case "AUTH_LOGOUT":
        resetSession();
        return { ok: true, status: await oauth.logout() };
      case "LIST_WORKSPACES": {
        const mine = epoch;
        const r = await api.listWorkspaces();
        if (mine !== epoch) return { ok: false, error: "sessao_alterada" };
        if (r.error === "sessao_expirada") { resetSession(); await oauth.logout(); return r; }
        allowedWorkspaces = new Set(r.ok ? r.workspaces.map((w) => w.id) : []);
        return r;
      }
      case "CONTACT_LOOKUP": {
        const mine = epoch;
        const r = await api.lookup(message.workspaceId, message.phone, allowedWorkspaces);
        if (mine !== epoch) return { ok: false, error: "sessao_alterada" };
        if (r.error === "sessao_expirada") { resetSession(); await oauth.logout(); }
        return r;
      }
      case "SYNC_MESSAGES": {
        const mine = epoch;
        const r = await api.syncMessages(message.workspaceId, message.phone, message.chatName, message.messages, allowedWorkspaces);
        if (mine !== epoch) return { ok: false, error: "sessao_alterada" };
        if (r.error === "sessao_expirada") { resetSession(); await oauth.logout(); }
        return r;
      }
      default:
        return { ok: false, error: "Mensagem inválida" };
    }
  }

  /** Revogação da permissão do servidor: invalida sessão, workspaces e respostas pendentes. */
  async function revoke() {
    resetSession();
    try { await oauth.logout(); } catch { /* falha fechada: sessão já invalidada em memória */ }
  }

  return { handle, revoke, _allowedCount: () => allowedWorkspaces.size };
}
