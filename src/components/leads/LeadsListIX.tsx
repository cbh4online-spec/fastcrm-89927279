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
  DocumentStatusBadge,
  type DocumentStatusTone,
  ListKPIStrip,
  type ListKPI,
  scoreToneClass,
  moneyToneClass,
} from "@/components/documents/listing";
import { Flame, Target, Euro, Clock } from "lucide-react";
import { useSmartLeads, type SmartLead } from "@/hooks/useSmartLeads";
import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { LoadingSpinner, EmptyState } from "@/components/design-system";
import {
  LEAD_COLUMNS,
  LeadsColumnsPicker,
  useLeadColumns,
} from "./LeadsColumnsPicker";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useEntityListSelection } from "@/hooks/useEntityListSelection";
import { EntitySelectionBar } from "@/components/entity/EntitySelectionBar";
import { EntityMergeDialog } from "@/components/entity/EntityMergeDialog";
import { UnifiedDuplicateDialog } from "@/components/crm/UnifiedDuplicateDialog";


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
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {lead.name || "(sem nome)"}
            </span>
            <EntityStatusBadges
              size="sm"
              isBlocked={(lead as any).is_blocked}
              blockReason={(lead as any).block_reason}
              archivedAt={(lead as any).archived_at}
              archiveReason={(lead as any).archive_reason}
            />
          </div>
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
        <div className="w-full text-right">
          <span className={cn("text-sm font-semibold tabular-nums", scoreToneClass(lead.lead_score))}>
            {lead.lead_score ?? 0}
          </span>
        </div>
      );
    case "value":
      return (
        <div className="w-full text-right">
          <span className={cn("text-sm font-semibold tabular-nums", moneyToneClass("revenue", lead.estimated_value || 0))}>
            {formatCurrency(lead.estimated_value || 0)}
          </span>
        </div>
      );
    case "created_at":
      return (
        <div className="w-full text-right text-sm text-muted-foreground">
          {formatDate(lead.created_at)}
        </div>
      );
    case "last_contact": {
      const ts = lead.last_contact_at ? new Date(lead.last_contact_at).getTime() : 0;
      const stale = ts > 0 && Date.now() - ts > 14 * 24 * 60 * 60 * 1000;
      return (
        <div className={cn(
          "w-full text-right text-sm",
          !ts ? "text-destructive" : stale ? "text-warning font-medium" : "text-foreground",
        )}>
          {ts ? formatDate(lead.last_contact_at) : "Nunca"}
        </div>
      );
    }
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

const NUMERIC_COLUMNS = ["score", "value", "created_at", "last_contact"];

export function LeadsListIX() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [createOpen, setCreateOpen] = useState(false);
  const [entityAction, setEntityAction] = useState<EntityActionRequest>(null);
  const { columns, setColumns } = useLeadColumns();

  const [archiveState, setArchiveState] = useState<EntityArchiveState>("active");

  const { data, isLoading } = useSmartLeads({
    search,
    page,
    pageSize,
    archiveState,
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

  const [mergeOpen, setMergeOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const pageIds = useMemo(() => sortedLeads.map((l) => l.id), [sortedLeads]);
  const selection = useEntityListSelection(pageIds);
  const selectedRecords = useMemo(
    () => sortedLeads.filter((l) => selection.selectedSet.has(l.id)),
    [sortedLeads, selection.selectedSet],
  );


  const kpis = useMemo<ListKPI[]>(() => {
    let hot = 0, pipeline = 0, stale = 0, scored = 0, scoreSum = 0;
    const staleCut = Date.now() - 14 * 24 * 60 * 60 * 1000;
    for (const l of sortedLeads) {
      if ((l.ai_temperature || "").toLowerCase() === "hot") hot += 1;
      pipeline += Number(l.estimated_value) || 0;
      const ts = l.last_contact_at ? new Date(l.last_contact_at).getTime() : 0;
      if (!ts || ts < staleCut) stale += 1;
      if (l.lead_score != null) { scored += 1; scoreSum += Number(l.lead_score) || 0; }
    }
    const avg = scored > 0 ? Math.round(scoreSum / scored) : 0;
    return [
      { key: "hot", label: "Leads quentes", value: String(hot), icon: Flame, tone: hot > 0 ? "danger" : "neutral" },
      { key: "pipeline", label: "Valor potencial", value: formatCurrency(pipeline), icon: Euro, tone: "primary" },
      { key: "score", label: "Score médio", value: String(avg), icon: Target, tone: avg >= 70 ? "success" : avg >= 40 ? "warning" : "neutral" },
      { key: "stale", label: "Sem contacto (14d)", value: String(stale), icon: Clock, tone: stale > 0 ? "warning" : "neutral" },
    ];
  }, [sortedLeads]);

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setDuplicatesOpen(true)}
            className="h-12 rounded-full px-6 text-sm font-semibold"
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicados
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-12 rounded-full bg-primary px-6 text-sm font-semibold shadow-sm hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar Lead
          </Button>
        </div>
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
          extra={
            <div className="flex items-center gap-2">
              <EntityArchiveFilter value={archiveState} onChange={(v) => { setArchiveState(v); setPage(0); }} />
              <LeadsColumnsPicker value={columns} onChange={setColumns} />
            </div>
          }
        />
      }
    >
      <ListKPIStrip items={kpis} isLoading={isLoading} note="Valores calculados sobre a página atual de resultados." />

      <EntitySelectionBar
        count={selection.count}
        entityLabel="lead"
        onMerge={() => setMergeOpen(true)}
        onClear={selection.clear}
      />

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
          <div className="flex items-center gap-4 px-4">
            <Checkbox
              checked={selection.allPageSelected}
              onCheckedChange={() => selection.togglePage()}
              aria-label="Selecionar todas as leads da página"
            />
            <div className="min-w-0 flex-1">
              <ListColumnsHeader
                orderedColumns={orderedColumns}
                definitions={LEAD_COLUMNS}
                columnWidth={COLUMN_WIDTH}
                rightAlignedKeys={NUMERIC_COLUMNS}
              />
            </div>
          </div>
          {sortedLeads.map((lead, idx) => (
            <div
              key={lead.id}
              role="button"
              onClick={() => {
                saveEntityListNavigation("lead", sortedLeads.map((l) => l.id), "/dashboard/leads");
                navigate(`/dashboard/leads/${lead.id}`);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-4 overflow-x-auto rounded-xl border border-border px-4 py-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40 hover:shadow-md",
                idx % 2 === 1 ? "bg-muted/20" : "bg-card",
                ((lead as any).is_blocked || (lead as any).archived_at) && "opacity-60",
                selection.isSelected(lead.id) && "border-primary/50 bg-primary/5",
              )}
            >
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selection.isSelected(lead.id)}
                  onCheckedChange={() => selection.toggle(lead.id)}
                  aria-label={`Selecionar ${lead.name || "lead"}`}
                />
              </div>
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
              <div className="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <EntityArchiveBlockActions
                      entity="lead"
                      id={lead.id}
                      isBlocked={(lead as any).is_blocked}
                      archivedAt={(lead as any).archived_at}
                      withSeparator={false}
                      onRequestBlock={(rid) => setEntityAction({ action: "block", id: rid })}
                      onRequestArchive={(rid) => setEntityAction({ action: "archive", id: rid })}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
      <EntityMergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        entity="lead"
        records={selectedRecords as any}
        onMerged={selection.clear}
      />
      <UnifiedDuplicateDialog open={duplicatesOpen} onOpenChange={setDuplicatesOpen} entityType="leads" />

      <EntityArchiveBlockDialogs
        entity="lead"
        request={entityAction}
        onOpenChange={(o) => { if (!o) setEntityAction(null); }}
      />
    </DocumentListLayout>
  );
}
