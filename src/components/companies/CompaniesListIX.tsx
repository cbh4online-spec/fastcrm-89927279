import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DocumentListLayout,
  DocumentListToolbar,
  DocumentRow,
} from "@/components/documents/listing";
import { useCompanies, type Company } from "@/hooks/useCompanies";
import { CreateCompanyDialog } from "@/components/companies/CreateCompanyDialog";
import { LoadingSpinner, EmptyState } from "@/components/design-system";

type SortKey = "name" | "created_at" | "total_revenue";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value || 0);
}

export function CompaniesListIX() {
  const navigate = useNavigate();
  const { companiesQuery } = useCompanies() as unknown as { companiesQuery: { data?: Company[]; isLoading: boolean } };
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [createOpen, setCreateOpen] = useState(false);

  const all = companiesQuery.data ?? [];

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
      else if (sortBy === "total_revenue") cmp = (a.total_revenue || 0) - (b.total_revenue || 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [all, search, sortBy, sortDir]);

  const totalCount = filtered.length;
  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);

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
        />
      }
    >
      {companiesQuery.isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : pageItems.length === 0 ? (
        <EmptyState title="Sem empresas" description="Não foram encontradas empresas com os filtros atuais." />
      ) : (
        pageItems.map((c) => (
          <DocumentRow
            key={c.id}
            number={c.name || "(sem nome)"}
            subtitle={c.tax_id || undefined}
            clientName={c.email || "—"}
            clientSubtitle={c.website || c.phone || undefined}
            issueDate={new Date(c.created_at).toLocaleDateString("pt-PT")}
            totalPrimary={formatCurrency(c.total_revenue || 0)}
            totalSecondary="Faturação"
            onClick={() => navigate(`/dashboard/companies/${c.id}`)}
          />
        ))
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
