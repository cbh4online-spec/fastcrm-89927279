import { ListColumnsHeader } from "@/components/documents/listing/ListColumnsHeader";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DocumentListLayout,
  DocumentListToolbar,
  ListKPIStrip,
  type ListKPI,
  scoreToneClass,
} from "@/components/documents/listing";
import { Users, UserPlus, Mail, Phone, Lock } from "lucide-react";
import {
  ListColumnsPicker,
  useListColumns,
  type ListColumnDef,
} from "@/components/documents/listing/ListColumnsPicker";
import { usePageElementVisibility } from "@/hooks/usePageElementVisibility";
import { useContacts, type Contact } from "@/hooks/useContacts";
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog";
import { LoadingSpinner, EmptyState } from "@/components/design-system";
import { saveEntityListNavigation } from "@/hooks/useEntityListNavigation";
import { EntityArchiveFilter, type EntityArchiveState } from "@/components/entity/EntityArchiveFilter";
import { EntityStatusBadges } from "@/components/entity/EntityStatusBadges";
import { EntityArchiveBlockActions, EntityArchiveBlockDialogs, type EntityActionRequest } from "@/components/entity/EntityArchiveBlockActions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "name" | "created_at" | "pare_score";

const COLUMNS: ListColumnDef[] = [
  { key: "name", label: "Nome", required: true },
  { key: "email", label: "Email", defaultVisible: true },
  { key: "phone", label: "Telefone", defaultVisible: true },
  { key: "company", label: "Empresa", defaultVisible: true },
  { key: "job_title", label: "Cargo", defaultVisible: false },
  { key: "tax_id", label: "NIF", defaultVisible: false },
  { key: "client_number", label: "Nº cliente", defaultVisible: false },
  { key: "lead_status", label: "Estado", defaultVisible: false },
  { key: "pare_score", label: "Score PARE", defaultVisible: true },
  { key: "icp_fit_score", label: "ICP Fit", defaultVisible: false },
  { key: "engagement_score", label: "Engagement", defaultVisible: false },
  { key: "created_at", label: "Data de criação", defaultVisible: true },
  { key: "next_followup_at", label: "Próximo follow-up", defaultVisible: false },
  { key: "tags", label: "Tags", defaultVisible: false },
];

const COLUMN_WIDTH: Record<string, string> = {
  name: "min-w-[180px] flex-1",
  email: "min-w-[200px] flex-1",
  phone: "w-[140px] shrink-0",
  company: "min-w-[160px] flex-1",
  job_title: "w-[140px] shrink-0",
  tax_id: "w-[110px] shrink-0",
  client_number: "w-[110px] shrink-0",
  lead_status: "w-[110px] shrink-0",
  pare_score: "w-[90px] shrink-0",
  icp_fit_score: "w-[90px] shrink-0",
  engagement_score: "w-[110px] shrink-0",
  created_at: "w-[120px] shrink-0",
  next_followup_at: "w-[140px] shrink-0",
  tags: "min-w-[140px] flex-1",
};

const NUMERIC_COLUMNS = [
  "pare_score", "icp_fit_score", "engagement_score", "created_at", "next_followup_at",
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("pt-PT"); } catch { return "—"; }
}

function renderCell(col: string, c: Contact) {
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
          {c.company && <span className="truncate text-xs text-muted-foreground">{c.company}</span>}
        </div>
      );
    case "email": return <span className="truncate text-sm text-foreground">{c.email || "—"}</span>;
    case "phone": return <span className="text-sm text-foreground">{c.phone || "—"}</span>;
    case "company": return <span className="truncate text-sm text-foreground">{c.company || "—"}</span>;
    case "job_title": return <span className="truncate text-sm text-foreground">{c.job_title || "—"}</span>;
    case "tax_id": return <span className="text-sm text-foreground">{c.tax_id || "—"}</span>;
    case "client_number": return <span className="text-sm text-foreground">{c.client_number || "—"}</span>;
    case "lead_status": return <span className="text-sm text-foreground">{c.lead_status || "—"}</span>;
    case "pare_score":
      return <div className="w-full text-right"><span className={cn("text-sm font-semibold tabular-nums", scoreToneClass(c.pare_score))}>{c.pare_score ?? 0}</span></div>;
    case "icp_fit_score":
      return <div className="w-full text-right"><span className={cn("text-sm font-semibold tabular-nums", scoreToneClass(c.icp_fit_score))}>{c.icp_fit_score ?? 0}</span></div>;
    case "engagement_score":
      return <div className="w-full text-right"><span className={cn("text-sm font-semibold tabular-nums", scoreToneClass(c.engagement_score))}>{c.engagement_score ?? 0}</span></div>;
    case "created_at":
      return <div className="w-full text-right text-sm text-muted-foreground">{formatDate(c.created_at)}</div>;
    case "next_followup_at": {
      const ts = c.next_followup_at ? new Date(c.next_followup_at).getTime() : 0;
      const late = ts > 0 && ts < Date.now();
      return (
        <div className={cn("w-full text-right text-sm", late ? "font-semibold text-destructive" : ts ? "text-foreground" : "text-muted-foreground/60")}>
          {formatDate(c.next_followup_at)}
        </div>
      );
    }
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

export function ContactsListIX() {
  const navigate = useNavigate();
  const [archiveState, setArchiveState] = useState<EntityArchiveState>("active");
  const { contacts, isLoading } = useContacts({ archiveState });
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [createOpen, setCreateOpen] = useState(false);
  const [entityAction, setEntityAction] = useState<EntityActionRequest>(null);
  const { isElementVisible } = usePageElementVisibility("contacts");
  const availableColumns = useMemo(
    () => COLUMNS.filter((c) => c.required || isElementVisible("column", c.key)),
    [isElementVisible],
  );
  const { columns, setColumns } = useListColumns("contacts-list-columns-v1", COLUMNS);

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
  const orderedColumns = useMemo(
    () => availableColumns.filter((c) => columns.includes(c.key)).map((c) => c.key),
    [availableColumns, columns],
  );

  const kpis = useMemo<ListKPI[]>(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let recent = 0, withEmail = 0, withPhone = 0, restricted = 0;
    for (const c of filtered) {
      if (new Date(c.created_at).getTime() >= cutoff) recent += 1;
      if (c.email && /.+@.+\..+/.test(c.email)) withEmail += 1;
      if (c.phone) withPhone += 1;
      if ((c as any).is_blocked || (c as any).archived_at) restricted += 1;
    }
    const total = filtered.length;
    const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}% do total` : undefined);
    return [
      { key: "total", label: "Contactos", value: String(total), icon: Users, tone: "primary" },
      { key: "recent", label: "Novos (30 dias)", value: String(recent), icon: UserPlus, tone: recent > 0 ? "success" : "neutral" },
      { key: "email", label: "Com email", value: String(withEmail), icon: Mail, tone: "neutral", hint: pct(withEmail) },
      { key: "phone", label: "Com telefone", value: String(withPhone), icon: Phone, tone: "neutral", hint: pct(withPhone) },
      { key: "restricted", label: "Bloq. / arquivados", value: String(restricted), icon: Lock, tone: restricted > 0 ? "warning" : "neutral" },
    ];
  }, [filtered]);

  return (
    <DocumentListLayout
      title="Contactos"
      searchValue={search}
      onSearchChange={(v) => { setSearch(v); setPage(0); }}
      searchPlaceholder="Pesquisar por nome, código, e-mail ou NIF"
      primaryAction={
        <Button
          onClick={() => navigate("/dashboard/contacts/new")}
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
          extra={
            <div className="flex items-center gap-2">
              <EntityArchiveFilter value={archiveState} onChange={(v) => { setArchiveState(v); setPage(0); }} />
              <ListColumnsPicker definitions={availableColumns} value={columns} onChange={setColumns} />
            </div>
          }
        />
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : pageItems.length === 0 ? (
        <EmptyState title="Sem contactos" description="Não foram encontrados contactos com os filtros atuais." />
      ) : (
        <div className="flex flex-col gap-2">
          <ListColumnsHeader
            orderedColumns={orderedColumns}
            definitions={availableColumns}
            columnWidth={COLUMN_WIDTH}
          />
          {pageItems.map((c) => (
            <div
              key={c.id}
              role="button"
              onClick={() => {
                saveEntityListNavigation(
                  "contact",
                  filtered.map((f) => f.id),
                  "/dashboard/contacts",
                );
                navigate(`/dashboard/contacts/${c.id}`);
              }}
              className="flex cursor-pointer items-center gap-4 overflow-x-auto rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md"
            >
              {orderedColumns.map((col) => (
                <div key={col} className={cn("flex min-w-0 items-center overflow-hidden", COLUMN_WIDTH[col] ?? "min-w-[120px]")}>
                  {renderCell(col, c)}
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
                      entity="contact"
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

      <CreateContactDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EntityArchiveBlockDialogs
        entity="contact"
        request={entityAction}
        onOpenChange={(o) => { if (!o) setEntityAction(null); }}
      />
    </DocumentListLayout>
  );
}
