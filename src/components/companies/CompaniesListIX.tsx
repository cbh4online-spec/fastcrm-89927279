import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DocumentListLayout,
  DocumentListToolbar,
} from "@/components/documents/listing";
import {
  ListColumnsPicker,
  useListColumns,
  type ListColumnDef,
} from "@/components/documents/listing/ListColumnsPicker";
import { useCompanies, type Company } from "@/hooks/useCompanies";
import { useCompaniesFinancials, type CompanyFinancials } from "@/hooks/useCompaniesFinancials";

import { CreateCompanyDialog } from "@/components/companies/CreateCompanyDialog";
import { LoadingSpinner, EmptyState } from "@/components/design-system";
import { cn } from "@/lib/utils";

type SortKey = "name" | "created_at" | "total_revenue";

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value || 0);
}
function formatDate(value?: string | null) {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("pt-PT"); } catch { return "—"; }
}

function moneyCell(label: string, value: number | null | undefined) {
  return (
    <div className="text-right">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm font-semibold">{formatCurrency(Number(value) || 0)}</div>
    </div>
  );
}

function paymentStatusCell(fin: CompanyFinancials | undefined) {
  if (!fin || fin.invoice_count === 0) {
    return <div className="text-right"><span className="text-xs text-muted-foreground">Pagamento</span><div className="text-sm text-muted-foreground">—</div></div>;
  }
  let label = "Liquidado";
  let tone = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (fin.overdue_total > 0.01) {
    label = "Vencido";
    tone = "bg-destructive/10 text-destructive";
  } else if (fin.pending_total > 0.01) {
    label = fin.paid_total > 0.01 ? "Parcial" : "Em dívida";
    tone = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
  return (
    <div className="text-right">
      <span className="text-xs text-muted-foreground">Pagamento</span>
      <div className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold", tone)}>{label}</div>
    </div>
  );
}

function renderCell(col: string, c: Company, fin: CompanyFinancials | undefined) {

  switch (col) {
    case "name":
      return (
        <div className="flex flex-col">
          <span className="truncate text-sm font-semibold text-foreground">{c.name || "(sem nome)"}</span>
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
    case "abc_category": return <span className="text-sm font-semibold text-foreground">{c.abc_category || "—"}</span>;
    case "pare_score":
      return <div className="text-right"><span className="text-xs text-muted-foreground">PARE</span><div className="text-sm font-semibold">{c.pare_score ?? 0}</div></div>;
    case "icp_fit_score":
      return <div className="text-right"><span className="text-xs text-muted-foreground">ICP</span><div className="text-sm font-semibold">{c.icp_fit_score ?? 0}</div></div>;
    case "total_revenue": return moneyCell("Faturação", fin?.net_total ?? c.total_revenue);
    case "average_ticket":
      return moneyCell("Ticket médio", fin && fin.invoice_count > 0 ? fin.net_total / fin.invoice_count : c.average_ticket);
    case "sales_2026": return moneyCell("2026", fin?.sales_2026 ?? c.sales_2026);
    case "sales_2025": return moneyCell("2025", fin?.sales_2025 ?? c.sales_2025);
    case "sales_2024": return moneyCell("2024", fin?.sales_2024 ?? c.sales_2024);
    case "payment_status": return paymentStatusCell(fin);
    case "paid_total": return moneyCell("Pago", fin?.paid_total ?? 0);
    case "pending_total": return moneyCell("Pendente", fin?.pending_total ?? 0);
    case "overdue_total": return moneyCell("Vencido", fin?.overdue_total ?? 0);
    case "invoice_count":
      return <div className="text-right"><span className="text-xs text-muted-foreground">Faturas</span><div className="text-sm font-semibold">{fin?.invoice_count ?? 0}</div></div>;
    case "last_purchase_date":
      return <div className="text-right text-xs"><div className="text-muted-foreground">Última compra</div><div className="font-medium text-foreground">{formatDate(fin?.last_invoice_date ?? c.last_purchase_date)}</div></div>;

    case "created_at":
      return <div className="text-right text-xs"><div className="text-muted-foreground">Criado</div><div className="font-medium text-foreground">{formatDate(c.created_at)}</div></div>;
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
  const { companies, isLoading } = useCompanies();
  const { financialsById } = useCompaniesFinancials();

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [createOpen, setCreateOpen] = useState(false);
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
  }, [all, search, sortBy, sortDir, financialsById]);


  const totalCount = filtered.length;
  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const orderedColumns = useMemo(
    () => COLUMNS.filter((c) => columns.includes(c.key)).map((c) => c.key),
    [columns],
  );

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
          extra={<ListColumnsPicker definitions={COLUMNS} value={columns} onChange={setColumns} />}
        />
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : pageItems.length === 0 ? (
        <EmptyState title="Sem empresas" description="Não foram encontradas empresas com os filtros atuais." />
      ) : (
        <div className="flex flex-col gap-2">
          {pageItems.map((c) => (
            <div
              key={c.id}
              role="button"
              onClick={() => navigate(`/dashboard/companies/${c.id}`)}
              className="flex cursor-pointer items-center gap-4 overflow-x-auto rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md"
            >
              {orderedColumns.map((col) => (
                <div key={col} className={cn("flex min-w-0 items-center overflow-hidden", COLUMN_WIDTH[col] ?? "min-w-[120px]")}>
                  {renderCell(col, c, financialsById.get(c.id))}
                </div>
              ))}
            </div>
          ))}
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
    </DocumentListLayout>
  );
}
