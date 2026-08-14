import { ListColumnsHeader } from "@/components/documents/listing/ListColumnsHeader";
import { useMemo, useState } from "react";
import { saveEntityListNavigation } from "@/hooks/useEntityListNavigation";
import { EntityArchiveFilter, type EntityArchiveState } from "@/components/entity/EntityArchiveFilter";
import { EntityStatusBadges } from "@/components/entity/EntityStatusBadges";
import { EntityArchiveBlockActions, EntityArchiveBlockDialogs, type EntityActionRequest } from "@/components/entity/EntityArchiveBlockActions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DocumentListLayout,
  DocumentListToolbar,
  ListKPIStrip,
  type ListKPI,
  moneyToneClass,
  statusToneClass,
  scoreToneClass,
  abcToneClass,
  variation,
  type MoneyKind,
} from "@/components/documents/listing";
import {
  ArrowUpRight,
  ArrowDownRight,
  Euro,
  Wallet,
  Clock,
  AlertTriangle,
  Receipt,
  Users,
} from "lucide-react";
import {
  ListColumnsPicker,
  useListColumns,
  type ListColumnDef,
} from "@/components/documents/listing/ListColumnsPicker";
import { usePageElementVisibility } from "@/hooks/usePageElementVisibility";
import { useCompanies, type Company } from "@/hooks/useCompanies";
import { useCompaniesFinancials, type CompanyFinancials } from "@/hooks/useCompaniesFinancials";

import { CreateCompanyDialog } from "@/components/companies/CreateCompanyDialog";
import { LoadingSpinner, EmptyState } from "@/components/design-system";
import { cn } from "@/lib/utils";

type SortKey = "name" | "created_at" | "total_revenue" | "pending_total";

const COLUMNS: ListColumnDef[] = [
  { key: "name", label: "Nome", required: true },
  { key: "tax_id", label: "NIF", defaultVisible: true },
  { key: "email", label: "Email", defaultVisible: true },
  { key: "phone", label: "Telefone", defaultVisible: false },
  { key: "website", label: "Website", defaultVisible: false },
  { key: "industry", label: "Indústria", defaultVisible: false },
  { key: "size", label: "Dimensão", defaultVisible: false },
  { key: "country", label: "País", defaultVisible: false },
  { key: "client_number", label: "Nº cliente", defaultVisible: false },
  { key: "abc_category", label: "Categoria ABC", defaultVisible: false },
  { key: "pare_score", label: "Score PARE", defaultVisible: false },
  { key: "icp_fit_score", label: "ICP Fit", defaultVisible: false },
  { key: "total_revenue", label: "Faturação total (s/IVA)", defaultVisible: true },
  { key: "average_ticket", label: "Ticket médio", defaultVisible: false },
  { key: "sales_2026", label: "Vendas 2026", defaultVisible: false },
  { key: "sales_2025", label: "Vendas 2025", defaultVisible: false },
  { key: "sales_2024", label: "Vendas 2024", defaultVisible: false },
  { key: "payment_status", label: "Estado pagamento", defaultVisible: true },
  { key: "paid_total", label: "Pago", defaultVisible: false },
  { key: "pending_total", label: "Pendente", defaultVisible: false },
  { key: "overdue_total", label: "Vencido", defaultVisible: false },
  { key: "invoice_count", label: "Nº faturas", defaultVisible: false },
  { key: "last_purchase_date", label: "Última compra", defaultVisible: false },
  { key: "created_at", label: "Data de criação", defaultVisible: true },
  { key: "tags", label: "Tags", defaultVisible: false },
];


const COLUMN_WIDTH: Record<string, string> = {
  name: "min-w-[200px] flex-1",
  tax_id: "w-[120px] shrink-0",
  email: "min-w-[200px] flex-1",
  phone: "w-[140px] shrink-0",
  website: "min-w-[160px] flex-1",
  industry: "w-[140px] shrink-0",
  size: "w-[110px] shrink-0",
  country: "w-[100px] shrink-0",
  client_number: "w-[110px] shrink-0",
  abc_category: "w-[110px] shrink-0",
  pare_score: "w-[90px] shrink-0",
  icp_fit_score: "w-[90px] shrink-0",
  total_revenue: "w-[150px] shrink-0",
  average_ticket: "w-[130px] shrink-0",
  sales_2026: "w-[130px] shrink-0",
  sales_2025: "w-[130px] shrink-0",
  sales_2024: "w-[130px] shrink-0",
  payment_status: "w-[130px] shrink-0",
  paid_total: "w-[120px] shrink-0",
  pending_total: "w-[120px] shrink-0",
  overdue_total: "w-[120px] shrink-0",
  invoice_count: "w-[90px] shrink-0",
  last_purchase_date: "w-[130px] shrink-0",

  created_at: "w-[120px] shrink-0",
  tags: "min-w-[140px] flex-1",
};

const NUMERIC_COLUMNS = [
  "pare_score", "icp_fit_score", "total_revenue", "average_ticket",
  "sales_2026", "sales_2025", "sales_2024", "payment_status",
  "paid_total", "pending_total", "overdue_total", "invoice_count",
  "last_purchase_date", "created_at",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value || 0);
}
function formatDate(value?: string | null) {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("pt-PT"); } catch { return "—"; }
}

function moneyCell(kind: MoneyKind, value: number | null | undefined) {
  const v = Number(value) || 0;
  return (
    <div className="w-full text-right">
      <span className={cn("text-sm font-semibold tabular-nums", moneyToneClass(kind, v))}>
        {formatCurrency(v)}
      </span>
    </div>
  );
}

function salesCell(value: number | null | undefined, previous: number | null | undefined) {
  const v = Number(value) || 0;
  const delta = variation(v, Number(previous) || 0);
  return (
    <div className="w-full text-right">
      <span className={cn("text-sm font-semibold tabular-nums", moneyToneClass("revenue", v))}>
        {formatCurrency(v)}
      </span>
      {delta !== null && Math.abs(delta) >= 1 && (
        <span
          className={cn(
            "ml-1 inline-flex items-center text-[11px] font-medium",
            delta >= 0 ? "text-success" : "text-destructive",
          )}
        >
          {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta).toFixed(0)}%
        </span>
      )}
    </div>
  );
}

function paymentStatusCell(fin: CompanyFinancials | undefined) {
  if (!fin || fin.invoice_count === 0) {
    return (
      <div className="w-full text-right">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Sem faturas
        </span>
      </div>
    );
  }
  let label = "Pago";
  let kind: MoneyKind = "paid";
  if (fin.overdue_total > 0.01) {
    label = "Vencido";
    kind = "overdue";
  } else if (fin.pending_total > 0.01) {
    label = fin.paid_total > 0.01 ? "Parcial" : "Pendente";
    kind = "pending";
  }
  return (
    <div className="w-full text-right">
      <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold", statusToneClass(kind))}>
        {label}
      </span>
    </div>
  );
}

function renderCell(col: string, c: Company, fin: CompanyFinancials | undefined) {

  switch (col) {
    case "name":
      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{c.name || "(sem nome)"}</span>
            <EntityStatusBadges
              size="sm"
              isBlocked={(c as any).is_blocked}
              blockReason={(c as any).block_reason}
              archivedAt={(c as any).archived_at}
              archiveReason={(c as any).archive_reason}
            />
          </div>
          {c.legal_name && c.legal_name !== c.name && (
            <span className="truncate text-xs text-muted-foreground">{c.legal_name}</span>
          )}
        </div>
      );
    case "tax_id": return <span className="text-sm text-foreground">{c.tax_id || "—"}</span>;
    case "email": return <span className="truncate text-sm text-foreground">{c.email || "—"}</span>;
    case "phone": return <span className="text-sm text-foreground">{c.phone || "—"}</span>;
    case "website": return <span className="truncate text-sm text-foreground">{c.website || "—"}</span>;
    case "industry": return <span className="truncate text-sm text-foreground">{c.industry || "—"}</span>;
    case "size": return <span className="text-sm text-foreground">{c.size || "—"}</span>;
    case "country": return <span className="text-sm text-foreground">{c.country || "—"}</span>;
    case "client_number": return <span className="text-sm text-foreground">{c.client_number || "—"}</span>;
    case "abc_category":
      return c.abc_category ? (
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", abcToneClass(c.abc_category))}>
          {c.abc_category}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground/60">—</span>
      );
    case "pare_score":
      return <div className="w-full text-right"><span className={cn("text-sm font-semibold tabular-nums", scoreToneClass(c.pare_score))}>{c.pare_score ?? 0}</span></div>;
    case "icp_fit_score":
      return <div className="w-full text-right"><span className={cn("text-sm font-semibold tabular-nums", scoreToneClass(c.icp_fit_score))}>{c.icp_fit_score ?? 0}</span></div>;
    case "total_revenue": return moneyCell("revenue", fin?.net_total ?? c.total_revenue);
    case "average_ticket":
      return moneyCell("revenue", fin && fin.invoice_count > 0 ? fin.net_total / fin.invoice_count : c.average_ticket);
    case "sales_2026": return salesCell(fin?.sales_2026 ?? c.sales_2026, fin?.sales_2025);
    case "sales_2025": return salesCell(fin?.sales_2025 ?? c.sales_2025, fin?.sales_2024);
    case "sales_2024": return salesCell(fin?.sales_2024 ?? c.sales_2024, fin?.sales_2023);
    case "payment_status": return paymentStatusCell(fin);
    case "paid_total": return moneyCell("paid", fin?.paid_total ?? 0);
    case "pending_total": return moneyCell("pending", fin?.pending_total ?? 0);
    case "overdue_total": return moneyCell("overdue", fin?.overdue_total ?? 0);
    case "invoice_count":
      return <div className="w-full text-right"><span className={cn("text-sm font-semibold tabular-nums", (fin?.invoice_count ?? 0) > 0 ? "text-foreground" : "text-muted-foreground/60")}>{fin?.invoice_count ?? 0}</span></div>;
    case "last_purchase_date":
      return <div className="w-full text-right text-sm text-foreground">{formatDate(fin?.last_invoice_date ?? c.last_purchase_date)}</div>;

    case "created_at":
      return <div className="w-full text-right text-sm text-muted-foreground">{formatDate(c.created_at)}</div>;
    case "tags":
      return (
        <div className="flex flex-wrap gap-1">
          {(c.tags || []).slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{t}</span>
          ))}
          {(!c.tags || c.tags.length === 0) && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      );
    default: return null;
  }
}

export function CompaniesListIX() {
  const navigate = useNavigate();
  const [archiveState, setArchiveState] = useState<EntityArchiveState>("active");
  const { companies, isLoading } = useCompanies({ archiveState });
  const { financialsById } = useCompaniesFinancials();

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [createOpen, setCreateOpen] = useState(false);
  const [entityAction, setEntityAction] = useState<EntityActionRequest>(null);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const { isElementVisible } = usePageElementVisibility("companies");
  const availableColumns = useMemo(
    () => COLUMNS.filter((c) => c.required || isElementVisible("column", c.key)),
    [isElementVisible],
  );
  const { columns, setColumns } = useListColumns("companies-list-columns-v1", COLUMNS);

  const all = (companies as Company[]) ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = all;
    if (q) {
      arr = arr.filter((c) =>
        [c.name, c.email, c.tax_id, c.website, c.phone]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    if (onlyOverdue) {
      arr = arr.filter((c) => (financialsById.get(c.id)?.overdue_total ?? 0) > 0.01);
    }
    arr = [...arr].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = (a.name || "").localeCompare(b.name || "");
      else if (sortBy === "created_at")
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortBy === "total_revenue")
        cmp = (financialsById.get(a.id)?.net_total ?? a.total_revenue ?? 0) - (financialsById.get(b.id)?.net_total ?? b.total_revenue ?? 0);
      else if (sortBy === "pending_total")
        cmp = (financialsById.get(a.id)?.pending_total ?? 0) - (financialsById.get(b.id)?.pending_total ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [all, search, sortBy, sortDir, financialsById, onlyOverdue]);


  const totalCount = filtered.length;
  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const orderedColumns = useMemo(
    () => availableColumns.filter((c) => columns.includes(c.key)).map((c) => c.key),
    [availableColumns, columns],
  );

  const kpis = useMemo<ListKPI[]>(() => {
    let revenue = 0, paid = 0, pending = 0, overdue = 0, invoices = 0, active = 0;
    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
    for (const c of filtered) {
      const f = financialsById.get(c.id);
      if (!f) continue;
      revenue += f.net_total;
      paid += f.paid_total;
      pending += f.pending_total;
      overdue += f.overdue_total;
      invoices += f.invoice_count;
      const last = f.last_invoice_date ? new Date(f.last_invoice_date).getTime() : 0;
      if (last >= cutoff) active += 1;
    }
    const ticket = invoices > 0 ? revenue / invoices : 0;
    return [
      { key: "revenue", label: "Faturação (s/IVA)", value: formatCurrency(revenue), icon: Euro, tone: "primary", hint: `${invoices} faturas` },
      { key: "paid", label: "Recebido", value: formatCurrency(paid), icon: Wallet, tone: paid > 0 ? "success" : "neutral" },
      { key: "pending", label: "Pendente", value: formatCurrency(pending), icon: Clock, tone: pending > 0.01 ? "warning" : "neutral" },
      {
        key: "overdue",
        label: "Vencido",
        value: formatCurrency(overdue),
        icon: AlertTriangle,
        tone: overdue > 0.01 ? "danger" : "neutral",
        hint: onlyOverdue ? "A filtrar" : "Clique para filtrar",
        active: onlyOverdue,
        onClick: () => { setOnlyOverdue((v) => !v); setPage(0); },
      },
      { key: "ticket", label: "Ticket médio", value: formatCurrency(ticket), icon: Receipt, tone: "neutral" },
      { key: "active", label: "Clientes ativos", value: String(active), icon: Users, tone: "neutral", hint: "com faturação a 12 meses" },
    ];
  }, [filtered, financialsById, onlyOverdue]);

  return (
    <DocumentListLayout
      title="Empresas"
      searchValue={search}
      onSearchChange={(v) => { setSearch(v); setPage(0); }}
      searchPlaceholder="Pesquisar por nome, NIF, e-mail ou website"
      primaryAction={
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-12 rounded-full bg-primary px-6 text-sm font-semibold shadow-sm hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Criar Empresa
        </Button>
      }
      toolbar={
        <DocumentListToolbar
          sortOptions={[
            { value: "name", label: "Nome" },
            { value: "created_at", label: "Data de criação" },
            { value: "total_revenue", label: "Faturação" },
            { value: "pending_total", label: "Valor pendente" },

          ]}
          sortValue={sortBy}
          onSortChange={(v) => setSortBy(v as SortKey)}
          sortDirection={sortDir}
          onToggleSortDirection={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageSizeChange={(v) => { setPageSize(v); setPage(0); }}
          totalCount={totalCount}
          countLabel="Empresas"
          extra={
            <div className="flex items-center gap-2">
              <EntityArchiveFilter value={archiveState} onChange={(v) => { setArchiveState(v); setPage(0); }} />
              <ListColumnsPicker definitions={availableColumns} value={columns} onChange={setColumns} />
            </div>
          }
        />
      }
    >
      <ListKPIStrip
        items={kpis}
        isLoading={isLoading}
        note="Valores calculados sobre os resultados filtrados."
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : pageItems.length === 0 ? (
        <EmptyState title="Sem empresas" description="Não foram encontradas empresas com os filtros atuais." />
      ) : (
        <div className="flex flex-col gap-2">
          <ListColumnsHeader
            orderedColumns={orderedColumns}
            definitions={availableColumns}
            columnWidth={COLUMN_WIDTH}
            rightAlignedKeys={NUMERIC_COLUMNS}
          />
          {pageItems.map((c, idx) => {
            const fin = financialsById.get(c.id);
            const hasOverdue = (fin?.overdue_total ?? 0) > 0.01;
            const inactive = !!((c as any).archived_at || (c as any).is_blocked);
            return (
            <div
              key={c.id}
              role="button"
              onClick={() => {
                saveEntityListNavigation("company", filtered.map((x) => x.id), "/dashboard/companies");
                navigate(`/dashboard/companies/${c.id}`);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-4 overflow-x-auto rounded-xl border px-4 py-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40 hover:shadow-md",
                idx % 2 === 1 ? "bg-muted/20" : "bg-card",
                hasOverdue ? "border-l-4 border-l-destructive border-border" : "border-border",
                inactive && "opacity-60",
              )}
            >
              {orderedColumns.map((col) => (
                <div key={col} className={cn("flex min-w-0 items-center overflow-hidden", COLUMN_WIDTH[col] ?? "min-w-[120px]")}>
                  {renderCell(col, c, financialsById.get(c.id))}
                </div>
              ))}
              <div className="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <EntityArchiveBlockActions
                      entity="company"
                      id={c.id}
                      isBlocked={(c as any).is_blocked}
                      archivedAt={(c as any).archived_at}
                      withSeparator={false}
                      onRequestBlock={(rid) => setEntityAction({ action: "block", id: rid })}
                      onRequestArchive={(rid) => setEntityAction({ action: "archive", id: rid })}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {totalCount > pageSize && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
          <span className="text-muted-foreground">Página {page + 1} de {Math.max(1, Math.ceil(totalCount / pageSize))}</span>
          <Button variant="ghost" size="sm" disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage((p) => p + 1)}>Seguinte</Button>
        </div>
      )}

      <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EntityArchiveBlockDialogs
        entity="company"
        request={entityAction}
        onOpenChange={(o) => { if (!o) setEntityAction(null); }}
      />
    </DocumentListLayout>
  );
}
