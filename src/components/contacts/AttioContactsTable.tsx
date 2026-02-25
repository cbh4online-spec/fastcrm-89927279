import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSmartContacts, useAnalyzeContact, useBulkAnalyzeContacts, SmartContactsFilters, SmartContact } from "@/hooks/useSmartContacts";
import { useBulkAnalyzeEntityLinkedIn } from "@/hooks/useEntitySocialMediaAnalysis";
import { useContacts } from "@/hooks/useContacts";
import { CreateContactDialog } from "./CreateContactDialog";
import { DuplicateManagementDialog } from "./DuplicateManagementDialog";
import { AttioViewSelector } from "./AttioViewSelector";
import { AttioFilterBar, SortOption } from "./AttioFilterBar";
import { BulkActionsBar } from "@/components/crm/unified/BulkActionsBar";
import { BulkEditField } from "@/components/crm/unified/BulkEditDialog";
import { ColumnSelector, ColumnConfig, useColumnPreferences } from "@/components/common/ColumnSelector";
import { DynamicTableCell } from "@/components/common/DynamicTableCell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Download, Upload, Info, Settings2, ChevronLeft, ChevronRight, Sparkles, ExternalLink, MoreHorizontal, Reply, Target, Archive, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState, SearchEmptyState, TableSkeleton } from "@/components/design-system";
import { SavedView } from "@/hooks/useSavedViews";
import { useTranslation } from "react-i18next";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const AI_COLUMN_IDS = new Set(["temperature", "score", "type", "next_action", "insight"]);

export function AttioContactsTable() {
  const { t } = useTranslation("crm");

  const CONTACT_COLUMNS: ColumnConfig[] = useMemo(() => [
    { id: "name", label: t("col_contact"), category: "basic", defaultVisible: true },
    { id: "client_number", label: t("col_clientNumber"), category: "basic", defaultVisible: true },
    { id: "email", label: t("col_email"), category: "basic", defaultVisible: false },
    { id: "phone", label: t("col_phone"), category: "basic", defaultVisible: false },
    { id: "company", label: t("col_company"), category: "basic", defaultVisible: true },
    { id: "job_title", label: t("col_jobTitle"), category: "basic", defaultVisible: false },
    { id: "source", label: t("col_source"), category: "basic", defaultVisible: true },
    { id: "tags", label: t("col_tags"), category: "basic", defaultVisible: false },
    { id: "temperature", label: t("col_temperature"), category: "ai", defaultVisible: true, description: t("col_temperatureDesc") },
    { id: "score", label: t("col_score"), category: "ai", defaultVisible: true, description: t("col_scoreDesc") },
    { id: "type", label: t("col_type"), category: "ai", defaultVisible: true, description: t("col_typeDesc") },
    { id: "next_action", label: t("col_nextAction"), category: "ai", defaultVisible: true },
    { id: "sla", label: t("col_sla"), category: "business", defaultVisible: true, description: t("col_slaDesc") },
    { id: "estimated_value", label: t("col_estimatedValue"), category: "business", defaultVisible: false },
    { id: "created_at", label: t("col_createdAt"), category: "basic", defaultVisible: false },
    { id: "updated_at", label: t("col_updatedAt"), category: "basic", defaultVisible: false },
    { id: "linkedin_url", label: t("col_linkedin"), category: "relations", defaultVisible: false },
    { id: "notes", label: t("col_notes"), category: "basic", defaultVisible: false },
    { id: "abc_category", label: t("col_abcCategory"), category: "business", defaultVisible: false },
    { id: "client_status", label: t("col_clientStatus"), category: "business", defaultVisible: false },
  ], [t]);

  const sortOptions: SortOption[] = useMemo(() => [
    { value: "created_desc", label: t("sortNewest") },
    { value: "created_asc", label: t("sortOldest") },
    { value: "name_asc", label: t("sortNameAsc") },
    { value: "name_desc", label: t("sortNameDesc") },
    { value: "company_asc", label: t("sortCompanyAsc") },
    { value: "temperature_hot", label: t("sortHotFirst") },
    { value: "temperature_cold", label: t("sortColdFirst") },
    { value: "score_desc", label: t("sortHighestScore") },
    { value: "score_asc", label: t("sortLowestScore") },
  ], [t]);

  const filterFields = useMemo(() => [
    { value: "company", label: t("col_company") },
    { value: "source", label: t("source") },
    { value: "client_status", label: t("filterStatus") },
    { value: "ai_temperature", label: t("filterTemperature") },
    { value: "city", label: t("city") },
    { value: "tags", label: t("tags") },
  ], [t]);

  const contactBulkEditFields: BulkEditField[] = useMemo(() => [
    { key: "name", label: t("fullName"), type: "text" },
    { key: "email", label: t("col_email"), type: "text" },
    { key: "phone", label: t("col_phone"), type: "text" },
    { key: "company", label: t("col_company"), type: "text" },
    { key: "source", label: t("source"), type: "select", options: [
      { value: "website", label: t("bulkEditSourceWebsite") },
      { value: "referral", label: t("bulkEditSourceReferral") },
      { value: "linkedin", label: t("bulkEditSourceLinkedIn") },
      { value: "cold_call", label: t("bulkEditSourceColdCall") },
      { value: "event", label: t("bulkEditSourceEvent") },
      { value: "other", label: t("bulkEditSourceOther") },
    ]},
    { key: "client_status", label: t("bulkEditClientStatus"), type: "select", options: [
      { value: "prospect", label: t("bulkEditStatusProspect") },
      { value: "lead", label: t("bulkEditStatusLead") },
      { value: "active", label: t("bulkEditStatusActive") },
      { value: "churned", label: t("bulkEditStatusChurned") },
      { value: "inactive", label: t("bulkEditStatusInactive") },
    ]},
    { key: "ai_temperature", label: t("filterTemperature"), type: "select", options: [
      { value: "cold", label: t("temperatureCold") },
      { value: "warm", label: t("temperatureWarm") },
      { value: "hot", label: t("temperatureHot") },
    ]},
  ], [t]);

  const [filters] = useState<SmartContactsFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("created_desc");
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const { visibleColumns, setVisibleColumns, columnOrder, setColumnOrder } = useColumnPreferences("contacts-table-columns", CONTACT_COLUMNS);

  const orderedVisibleColumns = useMemo(() => {
    return CONTACT_COLUMNS
      .filter(col => visibleColumns.has(col.id) && col.id !== "name")
      .sort((a, b) => {
        const indexA = columnOrder.indexOf(a.id);
        const indexB = columnOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
  }, [visibleColumns, columnOrder, CONTACT_COLUMNS]);

  const { data: contacts, isLoading, refetch } = useSmartContacts(filters);
  const { deleteContacts, addTagsToContacts, bulkUpdateContacts } = useContacts();
  const analyze = useAnalyzeContact();
  const bulkAnalyze = useBulkAnalyzeContacts();
  const bulkAnalyzeLinkedIn = useBulkAnalyzeEntityLinkedIn('contact');

  // Search + sort
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    let result = contacts;
    if (searchValue) {
      const lower = searchValue.toLowerCase();
      result = result.filter(c => {
        return [c.name, c.email, c.phone, c.company, c.job_title, c.source, c.ai_insight, c.ai_next_action]
          .some(field => field?.toString().toLowerCase().includes(lower))
          || (c.tags || []).some((tag: string) => tag?.toLowerCase().includes(lower));
      });
    }
    result = [...result].sort((a, b) => {
      switch (sortValue) {
        case "name_asc": return (a.name || "").localeCompare(b.name || "");
        case "name_desc": return (b.name || "").localeCompare(a.name || "");
        case "company_asc": return (a.company || "").localeCompare(b.company || "");
        case "temperature_hot": {
          const o: Record<string, number> = { hot: 0, warm: 1, cold: 2 };
          return (o[a.ai_temperature] ?? 3) - (o[b.ai_temperature] ?? 3);
        }
        case "temperature_cold": {
          const o: Record<string, number> = { cold: 0, warm: 1, hot: 2 };
          return (o[a.ai_temperature] ?? 3) - (o[b.ai_temperature] ?? 3);
        }
        case "created_desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "score_desc": return (b.contact_score || 0) - (a.contact_score || 0);
        case "score_asc": return (a.contact_score || 0) - (b.contact_score || 0);
        default: return 0;
      }
    });
    return result;
  }, [contacts, searchValue, sortValue]);

  // Pagination
  const totalContacts = filteredContacts.length;
  const totalPages = Math.ceil(totalContacts / pageSize);
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  const allSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const toggleSelectAll = () => {
    if (allSelected) { const n = new Set(selectedIds); paginatedContacts.forEach(c => n.delete(c.id)); setSelectedIds(n); }
    else { const n = new Set(selectedIds); paginatedContacts.forEach(c => n.add(c.id)); setSelectedIds(n); }
  };
  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };

  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try { await analyze.mutateAsync({ contactId: id }); toast.success(t("contactAnalyzed")); }
    catch { toast.error(t("errorAnalyzingContact")); }
    finally { setAnalyzingId(null); }
  };

  const handleBulkDelete = async () => { await deleteContacts.mutateAsync(Array.from(selectedIds)); setSelectedIds(new Set()); };
  const handleAddTags = async (tags: string[]) => { await addTagsToContacts.mutateAsync({ ids: Array.from(selectedIds), tags }); setSelectedIds(new Set()); };
  const handleBulkEdit = async (changes: Record<string, unknown>) => {
    await bulkUpdateContacts.mutateAsync({ ids: Array.from(selectedIds), changes });
    toast.success(t("contactsUpdated", { count: selectedIds.size }));
    setSelectedIds(new Set());
    refetch();
  };

  const handleExport = () => {
    const selected = contacts?.filter(c => selectedIds.has(c.id)) || filteredContacts;
    const csv = [
      ["Nome", "Email", "Telefone", "Empresa", "Temperatura", "Score"].join(","),
      ...selected.map(c => [c.name, c.email || "", c.phone || "", c.company || "", c.ai_temperature || "", c.contact_score || ""].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contactos-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("exportComplete"));
  };

  const handleViewChange = (view: SavedView | null) => { setCurrentViewId(view?.id || null); };

  return (
    <div className="flex flex-col h-full -m-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">{t("contactsTitle")}</h1>
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors"><Info className="h-4 w-4" /></button>
          </TooltipTrigger><TooltipContent><p className="text-xs">{t("contactsTooltip")}</p></TooltipContent></Tooltip></TooltipProvider>
          {totalContacts > 0 && <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-medium">{totalContacts}</span>}
        </div>
        <Button size="sm" className="gap-1.5 h-8" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          {t("newContact")}
        </Button>
      </div>

      {/* ── View bar ── */}
      <div className="flex items-center gap-1.5 py-1.5 border-b border-border/40">
        <AttioViewSelector currentViewId={currentViewId} onViewChange={handleViewChange} />
        <div className="w-px h-4 bg-border/60" />
        <ColumnSelector columns={CONTACT_COLUMNS} visibleColumns={visibleColumns} columnOrder={columnOrder} onVisibleColumnsChange={setVisibleColumns} onColumnOrderChange={setColumnOrder} />
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs text-muted-foreground">
              <Download className="h-3.5 w-3.5" />
              {t("importExport")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover z-50">
            <DropdownMenuItem onClick={() => toast.info(t("importContacts"))}><Upload className="h-4 w-4 mr-2" />{t("importCSV")}</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExport}><Download className="h-4 w-4 mr-2" />{t("exportCSV")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Filter bar ── */}
      <div className="border-b border-border/40">
        <AttioFilterBar
          sortValue={sortValue} sortOptions={sortOptions}
          onSortChange={(v) => { setSortValue(v); setCurrentPage(1); }}
          searchValue={searchValue}
          onSearchChange={(v) => { setSearchValue(v); setCurrentPage(1); }}
          onRefresh={() => refetch()} onExport={handleExport}
          onDuplicates={() => setIsDuplicatesOpen(true)}
          filterFields={filterFields}
        />
      </div>

      {/* ── Bulk actions ── */}
      {selectedIds.size > 0 && (
        <BulkActionsBar entityType="contacts" selectedCount={selectedIds.size} onClearSelection={() => setSelectedIds(new Set())}
          onDelete={handleBulkDelete} onExport={handleExport} onAddTags={handleAddTags} onBulkEdit={handleBulkEdit} editableFields={contactBulkEditFields} />
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto mt-0 border-b border-border/40">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="w-10 px-3 py-2.5 text-left">
                <Checkbox checked={allSelected} ref={(el) => { if (el) (el as any).indeterminate = someSelected; }} onCheckedChange={toggleSelectAll} />
              </th>
              <th className="min-w-[200px] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("col_contact")}</th>
              {orderedVisibleColumns.map(col => (
                <th key={col.id} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {AI_COLUMN_IDS.has(col.id) && <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary leading-none">AI</span>}
                  </span>
                </th>
              ))}
              <th className="w-20 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={orderedVisibleColumns.length + 3} className="p-0"><TableSkeleton rows={8} columns={orderedVisibleColumns.length + 3} showHeader={false} /></td></tr>
            ) : !filteredContacts.length ? (
              <tr><td colSpan={orderedVisibleColumns.length + 3} className="text-center py-16">
                {searchValue ? <SearchEmptyState query={searchValue} /> : (
                  <EmptyState type="contacts" title={t("noContactsYet")} description={t("noContactsDesc")} action={{ label: t("addContact"), onClick: () => setIsCreateOpen(true) }} />
                )}
              </td></tr>
            ) : (
              paginatedContacts.map(contact => {
                const initials = contact.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                const tempGradient = contact.ai_temperature === 'hot' ? 'from-red-500/80 to-orange-500' : contact.ai_temperature === 'warm' ? 'from-amber-500/80 to-yellow-500' : 'from-blue-500/80 to-cyan-500';
                return (
                  <tr key={contact.id} className={cn("group border-b border-border/20 transition-colors hover:bg-muted/30", selectedIds.has(contact.id) && "bg-primary/5", contact.slaBreach && "bg-destructive/5")}>
                    <td className="w-10 px-3 py-2.5"><Checkbox checked={selectedIds.has(contact.id)} onCheckedChange={() => toggleSelect(contact.id)} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-8 w-8 ring-1 ring-border/50"><AvatarFallback className={cn("bg-gradient-to-br text-white text-[10px] font-semibold", tempGradient)}>{initials}</AvatarFallback></Avatar>
                          {contact.ai_temperature === 'hot' && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-[1.5px] border-background animate-pulse" />}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/dashboard/contacts/${contact.id}`} className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate block leading-tight">{contact.name}</Link>
                          {contact.job_title && <span className="text-xs text-muted-foreground truncate block leading-tight mt-0.5">{contact.job_title}</span>}
                        </div>
                      </div>
                    </td>
                    {orderedVisibleColumns.map(col => (
                      <td key={col.id} className="px-3 py-2.5"><DynamicTableCell columnId={col.id} entity={contact as any} entityType="contact" /></td>
                    ))}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAnalyze(contact.id)} disabled={analyzingId === contact.id}>
                          <Sparkles className={cn("w-3.5 h-3.5", analyzingId === contact.id && "animate-pulse")} />
                        </Button>
                        <Link to={`/dashboard/contacts/${contact.id}`}><Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="w-3.5 h-3.5" /></Button></Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover z-50">
                            <DropdownMenuItem><Reply className="w-4 h-4 mr-2" />{t("sendMessage")}</DropdownMenuItem>
                            <DropdownMenuItem><Target className="w-4 h-4 mr-2" />{t("createOpportunity")}</DropdownMenuItem>
                            <DropdownMenuItem><Settings2 className="w-4 h-4 mr-2" />{t("activateAutomation")}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem><Archive className="w-4 h-4 mr-2" />{t("archive")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalContacts > 0 && (
        <div className="flex items-center justify-between py-2.5 px-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[60px] h-7 text-xs border-transparent bg-muted/40"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover z-50">{PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <span>{t("perPage")}</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-medium text-foreground">{totalContacts}</span> {t("totalContactsLabel")}
          </div>
          <div className="flex items-center gap-2">
            <span><span className="font-medium text-foreground">{currentPage}</span> / {totalPages || 1}</span>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronLeft className="h-3.5 w-3.5" /><ChevronLeft className="h-3.5 w-3.5 -ml-2" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}><ChevronRight className="h-3.5 w-3.5" /><ChevronRight className="h-3.5 w-3.5 -ml-2" /></Button>
            </div>
          </div>
        </div>
      )}

      <CreateContactDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <DuplicateManagementDialog open={isDuplicatesOpen} onOpenChange={setIsDuplicatesOpen} />
    </div>
  );
}
