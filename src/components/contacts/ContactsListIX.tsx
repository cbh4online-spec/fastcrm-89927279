import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DocumentListLayout,
  DocumentListToolbar,
  DocumentRow,
} from "@/components/documents/listing";
import { useContacts, type Contact } from "@/hooks/useContacts";
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog";
import { LoadingSpinner, EmptyState } from "@/components/design-system";

type SortKey = "name" | "created_at" | "pare_score";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value || 0);
}

export function ContactsListIX() {
  const navigate = useNavigate();
  const { contacts, isLoading } = useContacts();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [createOpen, setCreateOpen] = useState(false);

  const all = (contacts as Contact[]) ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = all;
    if (q) {
      arr = arr.filter((c) =>
        [c.name, c.email, c.tax_id, c.company, c.phone]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    arr = [...arr].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = (a.name || "").localeCompare(b.name || "");
      else if (sortBy === "created_at")
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortBy === "pare_score") cmp = (a.pare_score || 0) - (b.pare_score || 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [all, search, sortBy, sortDir]);

  const totalCount = filtered.length;
  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <DocumentListLayout
      title="Contactos"
      searchValue={search}
      onSearchChange={(v) => { setSearch(v); setPage(0); }}
      searchPlaceholder="Pesquisar por nome, código, e-mail ou NIF"
      primaryAction={
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-12 rounded-full bg-primary px-6 text-sm font-semibold shadow-sm hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Criar Contacto
        </Button>
      }
      toolbar={
        <DocumentListToolbar
          sortOptions={[
            { value: "name", label: "Nome" },
            { value: "created_at", label: "Data de criação" },
            { value: "pare_score", label: "Score PARE" },
          ]}
          sortValue={sortBy}
          onSortChange={(v) => setSortBy(v as SortKey)}
          sortDirection={sortDir}
          onToggleSortDirection={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageSizeChange={(v) => { setPageSize(v); setPage(0); }}
          totalCount={totalCount}
          countLabel="Contactos"
        />
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : pageItems.length === 0 ? (
        <EmptyState title="Sem contactos" description="Não foram encontrados contactos com os filtros atuais." />
      ) : (
        pageItems.map((c) => (
          <DocumentRow
            key={c.id}
            number={c.name || "(sem nome)"}
            subtitle={c.tax_id || undefined}
            clientName={c.email || "—"}
            clientSubtitle={c.company || c.phone || undefined}
            issueDate={new Date(c.created_at).toLocaleDateString("pt-PT")}
            totalPrimary={formatCurrency(0)}
            totalSecondary="Saldo"
            onClick={() => navigate(`/dashboard/contacts/${c.id}`)}
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

      <CreateContactDialog open={createOpen} onOpenChange={setCreateOpen} />
    </DocumentListLayout>
  );
}
