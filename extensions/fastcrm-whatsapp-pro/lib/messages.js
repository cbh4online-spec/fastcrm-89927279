/** Validação do remetente e tipos de mensagens aceites pelo service worker. */
import { MAX_RESULTS, MAX_WORKSPACES } from "./extension-api.js";

export const MESSAGE_TYPES = Object.freeze(["OPEN_TAB", "AUTH_STATUS", "AUTH_START", "AUTH_LOGOUT", "LIST_WORKSPACES", "CONTACT_LOOKUP", "SYNC_MESSAGES"]);

export function isTrustedSender(sender, runtimeId) {
  if (!sender || sender.id !== runtimeId || sender.tab) return false;
  return sender.url === `chrome-extension://${runtimeId}/sidepanel.html`;
}

export function isKnownMessage(message) {
  return !!message && typeof message === "object" && MESSAGE_TYPES.includes(message.type);
}

const s = (v, max) => (typeof v === "string" ? v.slice(0, max) : null);

/** Garante que nenhuma resposta à UI transporta tokens: só campos allowlisted. */
export function sanitizeResponse(response, type) {
  const out = { ok: !!response.ok };
  if (typeof response.status === "string") out.status = response.status;
  if (typeof response.error === "string") out.error = response.error;
  if (type === "LIST_WORKSPACES" && Array.isArray(response.workspaces)) {
    out.workspaces = response.workspaces.slice(0, MAX_WORKSPACES).map((w) => ({ id: s(w.id, 36), name: s(w.name, 120), role: s(w.role, 30) }));
  }
  if (type === "CONTACT_LOOKUP" && Array.isArray(response.contacts) && Array.isArray(response.leads)) {
    out.contacts = response.contacts.slice(0, MAX_RESULTS).map((r) => ({ id: s(r.id, 36), name: s(r.name, 120), phone: s(r.phone, 40), company: s(r.company, 120) }));
    out.leads = response.leads.slice(0, MAX_RESULTS).map((r) => ({ id: s(r.id, 36), name: s(r.name, 120), phone: s(r.phone, 40), status: s(r.status, 120) }));
  }
  if (type === "SYNC_MESSAGES" && response.ok) {
    out.conversationId = s(response.conversationId, 36);
    out.inserted = Number(response.inserted) || 0;
    out.skipped = Number(response.skipped) || 0;
    out.linked = s(response.linked, 10);
  }
  return out;
}
