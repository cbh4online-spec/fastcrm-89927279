/**
 * Cadência de prospeção Instagram → WhatsApp.
 *
 * Passo 1 (dia 0): DM no Instagram (assistida).
 * Passo 2 (dia 3): WhatsApp quando o perfil tem telefone válido; caso contrário Instagram.
 * Passo 3 (dia 7): última tentativa no Instagram.
 *
 * O canal é derivado (telefone + passo), por isso não é guardado na fila.
 * O envio WhatsApp passa sempre pela janela existente, com as proteções do servidor.
 */
export type CadenceChannel = "instagram" | "whatsapp";

const DAY_MS = 24 * 60 * 60 * 1000;
export const CADENCE_FOLLOW_UPS = [
  { step_index: 2, days: 3 },
  { step_index: 3, days: 7 },
] as const;

export function hasUsablePhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

export function resolveCadenceChannel(stepIndex: number, phone: string | null | undefined): CadenceChannel {
  return stepIndex === 2 && hasUsablePhone(phone) ? "whatsapp" : "instagram";
}

/** Registo criado só depois de o utilizador confirmar que enviou a primeira DM. */
export function buildInitialOutreachRow(params: { workspaceId: string; profileId: string; now?: Date }) {
  const now = params.now ?? new Date();
  return {
    workspace_id: params.workspaceId,
    profile_id: params.profileId,
    step_index: 1,
    scheduled_for: now.toISOString(),
    status: "sent",
  };
}

export function buildFollowUpRows(params: { workspaceId: string; profileId: string; now?: Date }) {
  const now = params.now ?? new Date();
  return CADENCE_FOLLOW_UPS.map((s) => ({
    workspace_id: params.workspaceId,
    profile_id: params.profileId,
    step_index: s.step_index,
    scheduled_for: new Date(now.getTime() + s.days * DAY_MS).toISOString(),
    status: "scheduled",
  }));
}
