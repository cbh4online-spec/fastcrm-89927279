import { useMemo, useState } from "react";
import { saveEntityListNavigation } from "@/hooks/useEntityListNavigation";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DocumentListLayout,
  DocumentListToolbar,
  DocumentStatusBadge,
  type DocumentStatusTone,
} from "@/components/documents/listing";
import { useSmartLeads, type SmartLead } from "@/hooks/useSmartLeads";
import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { LoadingSpinner, EmptyState } from "@/components/design-system";
import {
  LEAD_COLUMNS,
  LeadsColumnsPicker,
  useLeadColumns,
} from "./LeadsColumnsPicker";
import { cn } from "@/lib/utils";

type SortKey = "name" | "created_at" | "lead_score";

const STATUS_LABEL: Record<string, { label: string; tone: DocumentStatusTone }> = {
  new: { label: "Novo", tone: "pending" },
  in_progress: { label: "Em curso", tone: "sent" },
  completed: { label: "Concluído", tone: "approved" },
};

const TEMP_LABEL: Record<string, { label: string; tone: DocumentStatusTone }> = {
  hot: { label: "Quente", tone: "overdue" },
  warm: { label: "Morno", tone: "pending" },
  cold: { label: "Frio", tone: "sent" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("pt-PT");
  } catch {
    return "—";
  }
}

function renderCell(col: string, lead: SmartLead) {
  switch (col) {
    case "status": {
      const meta = STATUS_LABEL[lead.status] ?? { label: lead.status, tone: "neutral" as DocumentStatusTone };
      return <DocumentStatusBadge label={meta.label} tone={meta.tone} />;
    }
    case "name":
      return (
        <div className="flex flex-col">
          <span className="truncate text-sm font-semibold text-foreground">
            {lead.name || "(sem nome)"}
          </span>
          {lead.company_name && (
            <span className="truncate text-xs text-muted-foreground">
              {lead.company_name}
            </span>
          )}
        </div>
      );
    case "email":
      return (
        <span className="truncate text-sm text-foreground">
          {lead.email || "—"}
        </span>
      );
    case "phone":
      return <span className="text-sm text-foreground">{lead.phone || "—"}</span>;
    case "company":
      return (
        <span className="truncate text-sm text-foreground">
          {lead.company_name || "—"}
        </span>
      );
    case "source":
      return (
        <span className="text-sm text-muted-foreground">{lead.source || "—"}</span>
      );
    case "temperature": {
      const meta = TEMP_LABEL[lead.ai_temperature] ?? {
        label: lead.ai_temperature || "—",
        tone: "neutral" as DocumentStatusTone,
      };
      return <DocumentStatusBadge label={meta.label} tone={meta.tone} />;
    }
    case "score":
      return (
        <div className="text-right">
          <span className="text-xs text-muted-foreground">Score</span>
          <div className="text-sm font-semibold">{lead.lead_score ?? 0}</div>
        </div>
      );
    case "value":
      return (
        <div className="text-right">
          <span className="text-xs text-muted-foreground">Valor</span>
          <div className="text-sm font-semibold">
            {formatCurrency(lead.estimated_value || 0)}
          </div>
        </div>
      );
    case "created_at":
      return (
        <div className="text-right text-xs">
          <div className="text-muted-foreground">Criado</div>
          <div className="font-medium text-foreground">
            {formatDate(lead.created_at)}
          </div>
        </div>
      );
    case "last_contact":
      return (
        <div className="text-right text-xs">
          <div className="text-muted-foreground">Último contacto</div>
          <div className="font-medium text-foreground">
            {formatDate(lead.last_contact_at)}
          </div>
        </div>
      );
    case "assigned_to":
      return (
        <span className="truncate text-sm text-foreground">
          {lead.assigned_to ? lead.assigned_to.slice(0, 8) : "—"}
        </span>
      );
    case "tags":
      return (
        <div className="flex flex-wrap gap-1">
          {(lead.tags || []).slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
            >
              {t}
            </span>
          ))}
          {(!lead.tags || lead.tags.length === 0) && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      );
    default:
      return null;
  }
}

const COLUMN_WIDTH: Record<string, string> = {
  status: "w-[90px] shrink-0",
  name: "min-w-[180px] flex-1",
  email: "min-w-[180px] flex-1",
  phone: "w-[130px] shrink-0",
  company: "min-w-[160px] flex-1",
  source: "w-[120px] shrink-0",
  temperature: "w-[100px] shrink-0",
  score: "w-[80px] shrink-0",
  value: "w-[130px] shrink-0",
  created_at: "w-[120px] shrink-0",
  last_contact: "w-[140px] shrink-0",
  assigned_to: "w-[120px] shrink-0",
  tags: "min-w-[140px] flex-1",
};

export function LeadsListIX() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [createOpen, setCreateOpen] = useState(false);
  const { columns, setColumns } = useLeadColumns();

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

  const orderedColumns = useMemo(
    () => LEAD_COLUMNS.filter((c) => columns.includes(c.key)).map((c) => c.key),
    [columns]
  );

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
          extra={<LeadsColumnsPicker value={columns} onChange={setColumns} />}
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
        <div className="flex flex-col gap-2">
          {sortedLeads.map((lead) => (
            <div
              key={lead.id}
              role="button"
              onClick={() => {
                saveEntityListNavigation("lead", sortedLeads.map((l) => l.id), "/dashboard/leads");
                navigate(`/dashboard/leads/${lead.id}`);
              }}
              className="flex cursor-pointer items-center gap-4 overflow-x-auto rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md"
            >
              {orderedColumns.map((col) => (
                <div
                  key={col}
                  className={cn(
                    "flex min-w-0 items-center overflow-hidden",
                    COLUMN_WIDTH[col] ?? "min-w-[120px]"
                  )}
                >
                  {renderCell(col, lead)}
                </div>
              ))}
            </div>
          ))}
        </div>
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
