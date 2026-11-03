/**
 * Linha temporal unificada da ficha do aluno: junta inscrições, pagamentos,
 * presenças, certificados e contactos, ordenados do mais recente para o mais antigo.
 */
export type TimelineKind = "enrollment" | "payment" | "attendance" | "certificate" | "touchpoint";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  date: string; // ISO (data ou data/hora)
  title: string;
  detail?: string | null;
}

export interface TimelineSources {
  enrollments?: { id: string; enrolled_at?: string | null; created_at?: string | null; courseName?: string | null }[];
  installments?: { id: string; paid_at: string | null; paid_amount: number; installment_no: number }[];
  attendance?: { id: string; session_date: string; present: boolean; hours_attended: number }[];
  certificates?: { id: string; status: string; issued_at: string | null }[];
  touchpoints?: { id: string; occurred_at: string; typeLabel: string; message_preview?: string | null }[];
}

const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);

export function buildStudentTimeline(s: TimelineSources): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  for (const e of s.enrollments ?? []) {
    const d = e.enrolled_at ?? e.created_at;
    if (d) out.push({ id: `enr-${e.id}`, kind: "enrollment", date: d, title: "Inscrição", detail: e.courseName ?? null });
  }
  for (const i of s.installments ?? []) {
    if (i.paid_at && i.paid_amount > 0)
      out.push({ id: `pay-${i.id}`, kind: "payment", date: i.paid_at, title: `Pagamento da prestação ${i.installment_no}`, detail: eur(i.paid_amount) });
  }
  for (const a of s.attendance ?? []) {
    out.push({ id: `att-${a.id}`, kind: "attendance", date: a.session_date, title: a.present ? "Presença" : "Falta", detail: a.present ? `${a.hours_attended} h` : null });
  }
  for (const c of s.certificates ?? []) {
    if (c.status === "issued" && c.issued_at) out.push({ id: `cert-${c.id}`, kind: "certificate", date: c.issued_at, title: "Certificado emitido" });
  }
  for (const t of s.touchpoints ?? []) {
    out.push({ id: `tp-${t.id}`, kind: "touchpoint", date: t.occurred_at, title: t.typeLabel, detail: t.message_preview ?? null });
  }
  // Ordena pelo instante; datas sem hora contam como início do dia.
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id)));
}

/** Papéis da Jornada com acesso ao financeiro (espelha a política RLS). */
export const SJ_FINANCE_ROLES = ["gestao", "financeiro"] as const;

export function canSeeSjFinance(opts: { isSuperAdmin?: boolean; workspaceRole?: string | null; sjRoles?: string[] }): boolean {
  if (opts.isSuperAdmin) return true;
  if (opts.workspaceRole === "owner" || opts.workspaceRole === "admin") return true;
  return (opts.sjRoles ?? []).some((r) => (SJ_FINANCE_ROLES as readonly string[]).includes(r));
}
