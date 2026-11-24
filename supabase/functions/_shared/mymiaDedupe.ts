// Reconciliação de pessoas vindas do mymia.world: evita recriar leads já
// convertidas em contacto ou arquivadas. Fail-closed: erro de leitura => não cria.
// deno-lint-ignore-file no-explicit-any

/** Estados do mymia.world → estados permitidos em leads (new/in_progress/completed). */
export const MYMIA_STATUS_MAP: Record<string, string> = {
  novo: "new",
  contactado: "in_progress",
  reuniao_agendada: "in_progress",
  proposta_enviada: "in_progress",
  negociacao: "in_progress",
  ganho: "completed",
  perdido: "completed",
};

export function phoneVariantsFor(phone: string | null): string[] {
  if (!phone) return [];
  const digits = phone.replace(/\D/g, "");
  const set = new Set<string>([phone, digits, `+${digits}`]);
  if (digits.startsWith("351") && digits.length === 12) set.add(digits.slice(3));
  return [...set];
}

export type MymiaTarget =
  | { action: "create" }
  | { action: "update"; leadId: string }
  | { action: "skip"; reason: "ja_e_contacto" | "lead_convertida_ou_arquivada" | "erro_verificacao"; leadId?: string; contactId?: string };

function orFilter(email: string | null, phones: string[]): string | null {
  const parts: string[] = [];
  if (email) parts.push(`email.ilike.${email}`);
  for (const p of phones) parts.push(`phone.eq.${p}`);
  return parts.length ? parts.join(",") : null;
}

export async function resolveMymiaTarget(
  admin: any,
  workspaceId: string,
  linkedLeadId: string | null,
  email: string | null,
  phone: string | null,
): Promise<MymiaTarget> {
  const filter = orFilter(email, phoneVariantsFor(phone));

  // 1) Já é contacto ativo (ex.: lead convertida)? Nunca recriar lead.
  if (filter) {
    const { data: contact, error } = await admin
      .from("contacts").select("id")
      .eq("workspace_id", workspaceId).is("archived_at", null)
      .or(filter).limit(1).maybeSingle();
    if (error) return { action: "skip", reason: "erro_verificacao" };
    if (contact) return { action: "skip", reason: "ja_e_contacto", contactId: contact.id };
  }

  // 2) Lead ligada ou existente (incluindo arquivadas) por email/telefone.
  let lead: { id: string; archived_at: string | null; status: string | null } | null = null;
  if (linkedLeadId) {
    const { data, error } = await admin.from("leads").select("id, archived_at, status")
      .eq("id", linkedLeadId).maybeSingle();
    if (error) return { action: "skip", reason: "erro_verificacao" };
    lead = data;
  }
  if (!lead && filter) {
    const { data, error } = await admin.from("leads").select("id, archived_at, status")
      .eq("workspace_id", workspaceId).or(filter)
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (error) return { action: "skip", reason: "erro_verificacao" };
    lead = data;
  }
  if (lead) {
    if (lead.archived_at) return { action: "skip", reason: "lead_convertida_ou_arquivada", leadId: lead.id };
    return { action: "update", leadId: lead.id };
  }
  return { action: "create" };
}
