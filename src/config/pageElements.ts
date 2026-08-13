/**
 * Page Elements — quarto nível de visibilidade por workspace.
 *
 * Além de grupo de topo → sub-grupo → página, cada página pode declarar
 * elementos internos (separadores, campos, colunas de listagem e acções)
 * que o Super Admin pode marcar como visível / com cadeado / oculto.
 *
 * item_key guardado em `workspace_menu_overrides` (item_type = 'element'):
 *   `<routeKey>::<kind>::<elementId>`   ex.: `companies::tab::financial`
 *
 * Nota de segurança: esta camada é apenas de apresentação. Não substitui RLS.
 */

export type PageElementKind = "tab" | "field" | "column" | "action";

export interface PageElement {
  id: string;
  routeKey: string;
  kind: PageElementKind;
  label: string;
}

export const PAGE_ELEMENT_KIND_LABELS: Record<PageElementKind, string> = {
  tab: "Separadores",
  field: "Campos",
  column: "Colunas da listagem",
  action: "Acções",
};

export const PAGE_ELEMENT_KIND_ORDER: PageElementKind[] = ["tab", "field", "column", "action"];

export function buildElementKey(routeKey: string, kind: PageElementKind, id: string): string {
  return `${routeKey}::${kind}::${id}`;
}

const el = (
  routeKey: string,
  kind: PageElementKind,
  id: string,
  label: string,
): PageElement => ({ routeKey, kind, id, label });

/** Separadores das fichas de entidade (ids = MenuSection). */
const ENTITY_TABS: Array<[string, string]> = [
  ["overview", "Visão Geral"],
  ["contacts", "Contactos"],
  ["relationships", "Relações"],
  ["timeline", "Timeline"],
  ["activity", "Atividade"],
  ["notes", "Notas"],
  ["files", "Ficheiros"],
  ["team", "Equipa"],
  ["communication", "Mensagens"],
  ["support", "Suporte"],
  ["student-journey", "Student Journey"],
  ["business", "Negócios"],
  ["financial", "Financeiro"],
  ["financing", "Financiamento"],
  ["insights", "Insights IA"],
  ["data", "Dados"],
];

/** Campos do painel de detalhe (fieldKey usado em EntityDetailsPanel). */
const COMPANY_FIELDS: Array<[string, string]> = [
  ["website", "Domínio / Website"],
  ["email", "Email"],
  ["phone", "Telefone"],
  ["industry", "Indústria"],
  ["size", "Dimensão"],
  ["annual_revenue", "Receita anual"],
  ["employee_count", "Nº de funcionários"],
  ["tax_id", "NIF"],
  ["cae_description", "CAE"],
  ["address", "Morada"],
  ["city", "Cidade"],
  ["country", "País"],
  ["linkedin_url", "LinkedIn"],
  ["facebook_url", "Facebook"],
  ["instagram_url", "Instagram"],
  ["twitter_url", "Twitter/X"],
  ["youtube_url", "YouTube"],
  ["tiktok_url", "TikTok"],
  ["pinterest_url", "Pinterest"],
  ["whatsapp_url", "WhatsApp"],
];

const CONTACT_FIELDS: Array<[string, string]> = [
  ["email", "Email"],
  ["phone", "Telefone"],
  ["company", "Empresa"],
  ["job_title", "Cargo"],
  ["tax_id", "NIF"],
  ["address", "Morada"],
  ["city", "Cidade"],
  ["country", "País"],
  ["linkedin_url", "LinkedIn"],
  ["facebook_url", "Facebook"],
  ["instagram_url", "Instagram"],
  ["twitter_url", "Twitter/X"],
  ["whatsapp_url", "WhatsApp"],
];

const LEAD_FIELDS: Array<[string, string]> = [
  ["email", "Email"],
  ["phone", "Telefone"],
  ["company_name", "Empresa"],
  ["source", "Origem"],
  ["estimated_value", "Valor estimado"],
  ["lead_score", "Lead score"],
  ["pare_score", "Score PARE"],
  ["icp_fit_score", "ICP Fit"],
  ["tax_id", "NIF"],
  ["website", "Website"],
  ["address", "Morada"],
  ["city", "Cidade"],
];

const COMPANY_COLUMNS: Array<[string, string]> = [
  ["tax_id", "NIF"],
  ["email", "Email"],
  ["phone", "Telefone"],
  ["website", "Website"],
  ["industry", "Indústria"],
  ["size", "Dimensão"],
  ["country", "País"],
  ["client_number", "Nº cliente"],
  ["abc_category", "Categoria ABC"],
  ["pare_score", "Score PARE"],
  ["icp_fit_score", "ICP Fit"],
  ["total_revenue", "Faturação total (s/IVA)"],
  ["average_ticket", "Ticket médio"],
  ["sales_2026", "Vendas 2026"],
  ["sales_2025", "Vendas 2025"],
  ["sales_2024", "Vendas 2024"],
  ["payment_status", "Estado pagamento"],
  ["paid_total", "Pago"],
  ["pending_total", "Pendente"],
  ["overdue_total", "Vencido"],
  ["invoice_count", "Nº faturas"],
  ["last_purchase_date", "Última compra"],
  ["created_at", "Data de criação"],
  ["tags", "Tags"],
];

const CONTACT_COLUMNS: Array<[string, string]> = [
  ["email", "Email"],
  ["phone", "Telefone"],
  ["company", "Empresa"],
  ["job_title", "Cargo"],
  ["tax_id", "NIF"],
  ["client_number", "Nº cliente"],
  ["lead_status", "Estado"],
  ["pare_score", "Score PARE"],
  ["icp_fit_score", "ICP Fit"],
  ["engagement_score", "Engagement"],
  ["created_at", "Data de criação"],
  ["next_followup_at", "Próximo follow-up"],
  ["tags", "Tags"],
];

const COMPANY_ACTIONS: Array<[string, string]> = [
  ["new-invoice", "Nova fatura"],
  ["new-proposal", "Nova proposta"],
  ["new-order", "Nova encomenda"],
  ["view-invoices", "Ver faturas"],
  ["enrich-ai", "Enriquecer com IA"],
  ["archive", "Arquivar"],
  ["delete", "Apagar"],
  ["export", "Exportar"],
];

const CONTACT_ACTIONS: Array<[string, string]> = [
  ["new-invoice", "Nova fatura"],
  ["new-proposal", "Nova proposta"],
  ["enrich-ai", "Enriquecer com IA"],
  ["archive", "Arquivar"],
  ["delete", "Apagar"],
  ["export", "Exportar"],
];

const LEAD_ACTIONS: Array<[string, string]> = [
  ["convert", "Converter"],
  ["enrich-ai", "Enriquecer com IA"],
  ["archive", "Arquivar"],
  ["delete", "Apagar"],
  ["export", "Exportar"],
];

export const PAGE_ELEMENTS: PageElement[] = [
  // ── Empresas ───────────────────────────────────────────────
  ...ENTITY_TABS.filter(([id]) => id !== "student-journey").map(([id, label]) =>
    el("companies", "tab", id, label),
  ),
  ...COMPANY_FIELDS.map(([id, label]) => el("companies", "field", id, label)),
  ...COMPANY_COLUMNS.map(([id, label]) => el("companies", "column", id, label)),
  ...COMPANY_ACTIONS.map(([id, label]) => el("companies", "action", id, label)),

  // ── Contactos ──────────────────────────────────────────────
  ...ENTITY_TABS.filter(([id]) => !["contacts", "financing"].includes(id)).map(([id, label]) =>
    el("contacts", "tab", id, label),
  ),
  ...CONTACT_FIELDS.map(([id, label]) => el("contacts", "field", id, label)),
  ...CONTACT_COLUMNS.map(([id, label]) => el("contacts", "column", id, label)),
  ...CONTACT_ACTIONS.map(([id, label]) => el("contacts", "action", id, label)),

  // ── Leads ──────────────────────────────────────────────────
  ...ENTITY_TABS.filter(
    ([id]) => !["contacts", "financing", "financial", "relationships", "student-journey"].includes(id),
  ).map(([id, label]) => el("leads", "tab", id, label)),
  ...LEAD_FIELDS.map(([id, label]) => el("leads", "field", id, label)),
  ...LEAD_ACTIONS.map(([id, label]) => el("leads", "action", id, label)),

  // ── Pipeline (Oportunidades) ───────────────────────────────
  ...OPPORTUNITY_COLUMNS_REG.map(([id, label]) => el("opportunities", "column", id, label)),
  ...OPPORTUNITY_ACTIONS.map(([id, label]) => el("opportunities", "action", id, label)),

  // ── Renovações ─────────────────────────────────────────────
  ...RENEWAL_TABS.map(([id, label]) => el("renewals", "tab", id, label)),

  // ── Propostas ──────────────────────────────────────────────
  ...PROPOSAL_ACTIONS.map(([id, label]) => el("proposals", "action", id, label)),

  // ── Faturas ────────────────────────────────────────────────
  ...INVOICE_TABS.map(([id, label]) => el("invoices", "tab", id, label)),
  ...INVOICE_ACTIONS.map(([id, label]) => el("invoices", "action", id, label)),

  // ── Pagamentos ─────────────────────────────────────────────
  ...PAYMENT_ACTIONS.map(([id, label]) => el("payments", "action", id, label)),

  // ── Notas de encomenda ─────────────────────────────────────
  ...ORDER_NOTE_ACTIONS.map(([id, label]) => el("order-notes", "action", id, label)),

  // ── Cobranças ──────────────────────────────────────────────
  ...COLLECTION_ACTIONS.map(([id, label]) => el("collections", "action", id, label)),

  // ── Produtos ───────────────────────────────────────────────
  ...PRODUCT_TABS.map(([id, label]) => el("products", "tab", id, label)),
  ...PRODUCT_COLUMNS_REG.map(([id, label]) => el("products", "column", id, label)),
];


const byRoute = new Map<string, PageElement[]>();
for (const element of PAGE_ELEMENTS) {
  const list = byRoute.get(element.routeKey) ?? [];
  list.push(element);
  byRoute.set(element.routeKey, list);
}

export function getElementsForRoute(routeKey: string): PageElement[] {
  return byRoute.get(routeKey) ?? [];
}

export function hasElements(routeKey: string): boolean {
  return byRoute.has(routeKey);
}

export function getElementsGrouped(
  routeKey: string,
): Array<{ kind: PageElementKind; label: string; items: PageElement[] }> {
  const all = getElementsForRoute(routeKey);
  return PAGE_ELEMENT_KIND_ORDER.map((kind) => ({
    kind,
    label: PAGE_ELEMENT_KIND_LABELS[kind],
    items: all.filter((e) => e.kind === kind),
  })).filter((group) => group.items.length > 0);
}
