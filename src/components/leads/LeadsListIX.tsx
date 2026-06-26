import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DocumentListLayout,
  DocumentListToolbar,
  DocumentRow,
  DocumentStatusBadge,
  type DocumentStatusTone,
} from "@/components/documents/listing";
import { useSmartLeads, type SmartLead } from "@/hooks/useSmartLeads";
import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { LoadingSpinner, EmptyState } from "@/components/design-system";

type SortKey = "name" | "created_at" | "lead_score";

const STATUS_LABEL: Record<string, { label: string; tone: DocumentStatusTone }> = {
  new: { label: "Novo", tone: "pending" },
  in_progress: { label: "Em curso", tone: "sent" },
  completed: { label: "Concluído", tone: "approved" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value || 0);
}

export function LeadsListIX() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useSmartLeads({
    search,
    page,
    pageSize,
    sortBy: `${sortBy}:${sortDir}`,
  });

  const leads: SmartLead[] = data?.data ?? [];
  const totalCount = data?.totalCount ?? 0;

  const sortedLeads = useMemo(() => {
    const arr = [...leads];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = (a.name || "").localeCompare(b.name || "");
      else if (sortBy === "created_at")
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortBy === "lead_score") cmp = (a.lead_score || 0) - (b.lead_score || 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [leads, sortBy, sortDir]);

  return (
    <DocumentListLayout
      title="Leads"
      searchValue={search}
      onSearchChange={(v) => {
        setSearch(v);
        setPage(0);
      }}
      searchPlaceholder="Pesquisar por nome, email ou empresa"
      primaryAction={
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-12 rounded-full bg-primary px-6 text-sm font-semibold shadow-sm hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Criar Lead
        </Button>
      }
      toolbar={
        <DocumentListToolbar
          sortOptions={[
            { value: "name", label: "Nome" },
            { value: "created_at", label: "Data de criação" },
            { value: "lead_score", label: "Score" },
          ]}
          sortValue={sortBy}
          onSortChange={(v) => setSortBy(v as SortKey)}
          sortDirection={sortDir}
          onToggleSortDirection={() =>
            setSortDir((d) => (d === "asc" ? "desc" : "asc"))
          }
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageSizeChange={(v) => {
            setPageSize(v);
            setPage(0);
          }}
          totalCount={totalCount}
          countLabel="Leads"
        />
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : sortedLeads.length === 0 ? (
        <EmptyState
          title="Sem leads"
          description="Não foram encontrados leads com os filtros atuais."
        />
      ) : (
        sortedLeads.map((lead) => {
          const statusMeta = STATUS_LABEL[lead.status] ?? {
            label: lead.status,
            tone: "neutral" as DocumentStatusTone,
          };
          return (
            <DocumentRow
              key={lead.id}
              statusBadge={
                <DocumentStatusBadge label={statusMeta.label} tone={statusMeta.tone} />
              }
              number={lead.name || "(sem nome)"}
              subtitle={lead.company_name || undefined}
              clientName={lead.email || "—"}
              clientSubtitle={lead.phone || undefined}
              issueDate={new Date(lead.created_at).toLocaleDateString("pt-PT")}
              totalPrimary={formatCurrency(lead.estimated_value || 0)}
              totalSecondary={`Score ${lead.lead_score ?? 0}`}
              onClick={() => navigate(`/dashboard/leads/${lead.id}`)}
            />
          );
        })
      )}

      {totalCount > pageSize && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-muted-foreground">
            Página {page + 1} de {Math.max(1, Math.ceil(totalCount / pageSize))}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={(page + 1) * pageSize >= totalCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Seguinte
          </Button>
        </div>
      )}

      <CreateLeadDialog open={createOpen} onOpenChange={setCreateOpen} />
    </DocumentListLayout>
  );
}
