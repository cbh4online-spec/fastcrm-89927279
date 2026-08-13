/** Variáveis suportadas nos templates de cobrança (email/WhatsApp). */
export const COLLECTION_TEMPLATE_VARIABLES: Array<{ key: string; label: string }> = [
  { key: "nome", label: "Nome do devedor" },
  { key: "total_em_divida", label: "Total em dívida" },
  { key: "total_faturado", label: "Total faturado" },
  { key: "total_pago", label: "Total pago" },
  { key: "dias_atraso", label: "Dias de atraso" },
  { key: "num_faturas", label: "Nº de faturas" },
  { key: "lista_faturas", label: "Lista de faturas" },
  { key: "nif", label: "NIF" },
];

export function renderCollectionTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key: string) => {
    const v = vars[key.toLowerCase()];
    return v === null || v === undefined ? "" : String(v);
  });
}

export function eur(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(
    Number(value ?? 0),
  );
}

/** Constrói o dicionário de variáveis a partir de um caso de cobrança. */
export function buildCaseTemplateVars(caseRow: {
  debtor_name?: string | null;
  debtor_tax_id?: string | null;
  total_due?: number | null;
  total_paid?: number | null;
  days_overdue?: number | null;
  invoices_count?: number | null;
  invoices?: Array<{
    snapshot_total?: number | null;
    snapshot_amount_paid?: number | null;
    snapshot_due_date?: string | null;
    invoice?: { invoice_number?: string | null } | null;
  }>;
}): Record<string, string> {
  const lista = (caseRow.invoices ?? [])
    .map((i) => {
      const open = Number(i.snapshot_total ?? 0) - Number(i.snapshot_amount_paid ?? 0);
      return `• ${i.invoice?.invoice_number ?? "s/ nº"} — ${eur(open)} (venc. ${
        i.snapshot_due_date ?? "—"
      })`;
    })
    .join("\n");

  return {
    nome: caseRow.debtor_name ?? "Cliente",
    total_em_divida: eur(Number(caseRow.total_due ?? 0) - Number(caseRow.total_paid ?? 0)),
    total_faturado: eur(caseRow.total_due),
    total_pago: eur(caseRow.total_paid),
    dias_atraso: String(caseRow.days_overdue ?? 0),
    num_faturas: String(caseRow.invoices_count ?? 0),
    lista_faturas: lista || "—",
    nif: caseRow.debtor_tax_id ?? "",
  };
}
