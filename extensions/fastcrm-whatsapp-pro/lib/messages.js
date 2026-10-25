/** Validação do remetente e tipos de mensagens aceites pelo service worker. */
export const MESSAGE_TYPES = Object.freeze(["OPEN_TAB", "AUTH_STATUS", "AUTH_START", "AUTH_LOGOUT", "CONTACT_LOOKUP"]);

export function isTrustedSender(sender, runtimeId) {
  if (!sender || sender.id !== runtimeId || sender.tab) return false;
  return sender.url === `chrome-extension://${runtimeId}/sidepanel.html`;
}

export function isKnownMessage(message) {
  return !!message && typeof message === "object" && MESSAGE_TYPES.includes(message.type);
}

/** Garante que nenhuma resposta à UI transporta tokens. */
export function sanitizeResponse(response) {
  const out = { ok: !!response.ok };
  if (typeof response.status === "string") out.status = response.status;
  if (typeof response.error === "string") out.error = response.error;
  return out;
}
