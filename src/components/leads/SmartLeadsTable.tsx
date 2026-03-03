import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  useSmartLeads, 
  useAnalyzeLead, 
  useBulkAnalyzeLeads,
  SmartLeadsFilters,
  SmartLead,
} from "@/hooks/useSmartLeads";
import { useBulkAnalyzeEntityLinkedIn } from "@/hooks/useEntitySocialMediaAnalysis";
import { useDeleteLeads } from "@/hooks/useLeads";
import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { ColumnSelector, ColumnConfig, useColumnPreferences } from "@/components/common/ColumnSelector";
import { StickyTableWrapper, stickyHeaderCheckboxStyles, stickyHeaderNameStyles, stickyCheckboxStyles, stickyNameStyles } from "@/components/common/StickyTable";
import { DynamicTableCell } from "@/components/common/DynamicTableCell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Sparkles, Trash2, RefreshCw, Download, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft, Flame, Thermometer, Snowflake, Clock, UserX, MessageSquare, Target, Activity, Linkedin, ExternalLink, MoreHorizontal, Reply, Settings2, Archive, Building2, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState, SearchEmptyState, LoadingSpinner, TableSkeleton } from "@/components/design-system";
import { EntityAutomationsSection } from "@/components/automations/EntityAutomationsSection";
import { UnifiedDuplicateDialog } from "@/components/crm/UnifiedDuplicateDialog";
import { useTranslation } from "react-i18next";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function SmartLeadsTable() {
  const { t } = useTranslation("crm");

  const LEAD_COLUMNS: ColumnConfig[] = useMemo(() => [
    { id: "name", label: t("col_lead"), category: "basic", defaultVisible: true },
    { id: "email", label: t("col_email"), category: "basic", defaultVisible: false },
    { id: "phone", label: t("col_phone"), category: "basic", defaultVisible: false },
    { id: "external_email", label: t("col_externalEmail"), category: "basic", defaultVisible: false },
    { id: "fax", label: t("col_fax"), category: "basic", defaultVisible: false },
    { id: "source", label: t("col_source"), category: "basic", defaultVisible: false },
    { id: "status", label: t("col_status"), category: "basic", defaultVisible: true },
    { id: "tags", label: t("col_tags"), category: "basic", defaultVisible: false },
    { id: "company_name", label: t("col_company"), category: "basic", defaultVisible: false },
    { id: "company_status", label: t("col_companyStatus"), category: "basic", defaultVisible: false },
    { id: "address", label: t("col_address"), category: "basic", defaultVisible: false },
    { id: "city", label: t("col_city"), category: "basic", defaultVisible: false },
    { id: "county", label: t("col_county"), category: "basic", defaultVisible: false },
    { id: "parish", label: t("col_parish"), category: "basic", defaultVisible: false },
    { id: "region", label: t("col_region"), category: "basic", defaultVisible: false },
    { id: "postal_code", label: t("col_postalCode"), category: "basic", defaultVisible: false },
    { id: "latitude", label: t("col_latitude"), category: "basic", defaultVisible: false },
    { id: "longitude", label: t("col_longitude"), category: "basic", defaultVisible: false },
    { id: "temperature", label: t("col_temperature"), category: "ai", defaultVisible: true, description: t("col_temperatureDesc") },
    { id: "score", label: t("col_score"), category: "ai", defaultVisible: true, description: t("col_scoreDesc") },
    { id: "ai_lead_type", label: t("col_aiLeadType"), category: "ai", defaultVisible: false },
    { id: "next_action", label: t("col_nextAction"), category: "ai", defaultVisible: true },
    { id: "insight", label: t("col_insight"), category: "ai", defaultVisible: false },
    { id: "ai_analyzed_at", label: t("col_lastAnalysis"), category: "ai", defaultVisible: false },
    { id: "sla", label: t("col_sla"), category: "business", defaultVisible: true, description: t("col_slaDesc") },
    { id: "estimated_value", label: t("col_estimatedValue"), category: "business", defaultVisible: false },
    { id: "conversion_prob", label: t("col_conversionProb"), category: "business", defaultVisible: false },
    { id: "automation", label: t("col_automation"), category: "business", defaultVisible: false },
    { id: "assigned_to", label: t("col_assignedTo"), category: "business", defaultVisible: false },
    { id: "last_contact_at", label: t("col_lastContact"), category: "business", defaultVisible: false },
    { id: "business_category", label: t("col_businessCategory"), category: "business", defaultVisible: false },
    { id: "services", label: t("col_services"), category: "business", defaultVisible: false },
    { id: "tax_id", label: t("col_taxId"), category: "business", defaultVisible: false },
    { id: "founding_date", label: t("col_foundingDate"), category: "business", defaultVisible: false },
    { id: "capital_social", label: t("col_capitalSocial"), category: "business", defaultVisible: false },
    { id: "legal_nature", label: t("col_legalNature"), category: "business", defaultVisible: false },
    { id: "cae_codes", label: t("col_caeCodes"), category: "business", defaultVisible: false },
    { id: "cae_description", label: t("col_caeDescription"), category: "business", defaultVisible: false },
    { id: "website", label: t("col_website"), category: "relations", defaultVisible: false },
    { id: "linkedin_url", label: t("col_linkedin"), category: "relations", defaultVisible: false },
    { id: "facebook_url", label: t("col_facebook"), category: "relations", defaultVisible: false },
    { id: "instagram_url", label: t("col_instagram"), category: "relations", defaultVisible: false },
    { id: "twitter_url", label: t("col_twitter"), category: "relations", defaultVisible: false },
    { id: "google_place_id", label: t("col_googlePlaceId"), category: "relations", defaultVisible: false },
    { id: "rating", label: t("col_rating"), category: "relations", defaultVisible: false },
    { id: "reviews_count", label: t("col_reviewsCount"), category: "relations", defaultVisible: false },
    { id: "price_level", label: t("col_priceLevel"), category: "relations", defaultVisible: false },
    { id: "external_instagram_id", label: t("col_instagramId"), category: "relations", defaultVisible: false },
    { id: "external_whatsapp_id", label: t("col_whatsappId"), category: "relations", defaultVisible: false },
    { id: "external_username", label: t("col_externalUsername"), category: "relations", defaultVisible: false },
    { id: "created_at", label: t("col_createdAt"), category: "basic", defaultVisible: false },
    { id: "updated_at", label: t("col_updatedAt"), category: "basic", defaultVisible: false },
  ], [t]);

  const filterGroups: FilterGroup[] = useMemo(() => [
    { id: "temperature", label: t("filterTemperature"), icon: <Thermometer className="h-4 w-4" />, defaultOpen: true, items: [
      { id: "temp_hot", label: t("filterHot"), icon: <Flame className="h-4 w-4 text-red-500" /> },
      { id: "temp_warm", label: t("filterWarm"), icon: <Thermometer className="h-4 w-4 text-orange-500" /> },
      { id: "temp_cold", label: t("filterCold"), icon: <Snowflake className="h-4 w-4 text-blue-500" /> },
    ]},
    { id: "status", label: t("filterStatus"), icon: <Target className="h-4 w-4" />, defaultOpen: true, items: [
      { id: "status_new", label: t("filterNew") },
      { id: "status_contacted", label: t("filterContacted") },
      { id: "status_qualified", label: t("filterQualified") },
      { id: "status_proposal", label: t("filterInProposal") },
      { id: "status_lost", label: t("filterLost") },
    ]},
    { id: "activity", label: t("filterActivity"), icon: <Activity className="h-4 w-4" />, items: [
      { id: "activity_waiting", label: t("filterWaitingReply"), icon: <Clock className="h-4 w-4" /> },
      { id: "activity_no_reply", label: t("filterNoReply48h"), icon: <UserX className="h-4 w-4 text-amber-500" /> },
      { id: "activity_engaged", label: t("filterActiveConversation"), icon: <MessageSquare className="h-4 w-4 text-green-500" /> },
    ]},
    { id: "smart", label: t("filterSmartFilters"), icon: <Sparkles className="h-4 w-4" />, items: [
      { id: "smart_hot", label: t("filterMaxPriority") },
      { id: "smart_ready", label: t("filterReadyToConvert") },
      { id: "smart_nurture", label: t("filterNurture") },
      { id: "smart_risk", label: t("filterAtRisk") },
    ]},
  ], [t]);

  const pageTabs = useMemo(() => [
    { id: "leads", label: t("tabLeads") },
    { id: "smart-lists", label: t("tabSmartLists") },
    { id: "automations", label: t("tabAutomations") },
    { id: "import", label: t("tabImport") },
  ], [t]);

  const sortOptions = useMemo(() => [
    { value: "created_desc", label: t("sortNewest") },
    { value: "created_asc", label: t("sortOldest") },
    { value: "score_desc", label: t("sortHighestScore") },
    { value: "score_asc", label: t("sortLowestScore") },
    { value: "value_desc", label: t("sortHighestValue") },
    { value: "last_contact_desc", label: t("sortLastContact") },
  ], [t]);

  const [filters, setFilters] = useState<SmartLeadsFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("leads");
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("created_desc");

  const { visibleColumns, setVisibleColumns, columnOrder, setColumnOrder } = useColumnPreferences("leads-table-columns", LEAD_COLUMNS);

  const orderedVisibleColumns = useMemo(() => {
    return LEAD_COLUMNS
      .filter(col => visibleColumns.has(col.id) && col.id !== "name")
      .sort((a, b) => {
        const indexA = columnOrder.indexOf(a.id);
        const indexB = columnOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
  }, [visibleColumns, columnOrder, LEAD_COLUMNS]);

  const totalColumns = orderedVisibleColumns.length + 3;

  const { data: leads, isLoading, refetch } = useSmartLeads(filters);
  const deleteLeads = useDeleteLeads();
  const analyzeLead = useAnalyzeLead();
  const bulkAnalyze = useBulkAnalyzeLeads();
  const bulkAnalyzeLinkedIn = useBulkAnalyzeEntityLinkedIn('lead');

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (!searchValue) return leads;
    const lower = searchValue.toLowerCase();
    return leads.filter(l => {
      const searchableFields = [l.name, l.email, l.phone, (l as any).company_name, (l as any).address, (l as any).city, (l as any).county, (l as any).parish, (l as any).region, (l as any).postal_code, (l as any).tax_id, l.source, l.status, (l as any).website, (l as any).business_category, (l as any).cae_description, (l as any).capital_social, (l as any).legal_nature, l.ai_insight, l.ai_next_action, (l as any).external_email, (l as any).external_username, (l as any).linkedin_url, (l as any).facebook_url, (l as any).instagram_url, (l as any).twitter_url, (l as any).fax, (l as any).company_status, (l as any).assigned_to, (l as any).ai_lead_type];
      const tags = (l as any).tags || [];
      const services = (l as any).services || [];
      const caeCodes = (l as any).cae_codes || [];
      return searchableFields.some(field => field?.toString().toLowerCase().includes(lower))
        || tags.some((t: string) => t?.toLowerCase().includes(lower))
        || services.some((s: string) => s?.toLowerCase().includes(lower))
        || caeCodes.some((c: string) => c?.toLowerCase().includes(lower));
    });
  }, [leads, searchValue]);

  const sortedLeads = useMemo(() => {
    if (!filteredLeads.length) return filteredLeads;
    const sorted = [...filteredLeads];
    switch (sortValue) {
      case "created_desc": sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "created_asc": sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case "score_desc": sorted.sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0)); break;
      case "score_asc": sorted.sort((a, b) => (a.lead_score || 0) - (b.lead_score || 0)); break;
      case "value_desc": sorted.sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0)); break;
      case "last_contact_desc": sorted.sort((a, b) => { const dA = a.last_contact_at ? new Date(a.last_contact_at).getTime() : 0; const dB = b.last_contact_at ? new Date(b.last_contact_at).getTime() : 0; return dB - dA; }); break;
    }
    return sorted;
  }, [filteredLeads, sortValue]);

  const totalLeads = sortedLeads.length;
  const totalPages = Math.ceil(totalLeads / pageSize);
  const paginatedLeads = useMemo(() => { const s = (currentPage - 1) * pageSize; return sortedLeads.slice(s, s + pageSize); }, [sortedLeads, currentPage, pageSize]);
  const handlePageSizeChange = (newSize: string) => { setPageSize(Number(newSize)); setCurrentPage(1); };

  const handleFilterSelect = (filterId: string) => {
    const newFilterId = filterId === activeFilterId ? undefined : filterId;
    setActiveFilterId(newFilterId);
    if (!newFilterId) { setFilters({}); return; }
    if (newFilterId === "temp_hot") setFilters({ temperature: "hot" });
    else if (newFilterId === "temp_warm") setFilters({ temperature: "warm" });
    else if (newFilterId === "temp_cold") setFilters({ temperature: "cold" });
    else if (newFilterId === "status_new") setFilters({ status: "new" });
    else if (newFilterId === "status_contacted") setFilters({ status: "in_progress" });
    else if (newFilterId === "status_qualified") setFilters({ status: "completed" });
    else if (newFilterId === "status_proposal") setFilters({ status: "in_progress" });
    else if (newFilterId === "status_lost") setFilters({ status: "completed" });
    else if (newFilterId === "activity_waiting") setFilters({ smartFilter: "no_response" });
    else if (newFilterId === "activity_no_reply") setFilters({ smartFilter: "no_response" });
    else if (newFilterId === "activity_engaged") setFilters({ smartFilter: "high_intent" });
    else if (newFilterId === "smart_hot") setFilters({ smartFilter: "hot" });
    else if (newFilterId === "smart_ready") setFilters({ smartFilter: "high_intent" });
    else if (newFilterId === "smart_nurture") setFilters({ temperature: "warm" });
    else if (newFilterId === "smart_risk") setFilters({ smartFilter: "no_response" });
  };

  const allSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const toggleSelectAll = () => {
    if (allSelected) { const n = new Set(selectedIds); paginatedLeads.forEach(l => n.delete(l.id)); setSelectedIds(n); }
    else { const n = new Set(selectedIds); paginatedLeads.forEach(l => n.add(l.id)); setSelectedIds(n); }
  };
  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };

  const handleBulkDelete = async () => {
    try { await deleteLeads.mutateAsync(Array.from(selectedIds)); toast.success(t("leadsDeleted", { count: selectedIds.size })); setSelectedIds(new Set()); setShowDeleteDialog(false); }
    catch { toast.error(t("errorDeletingLeads")); }
  };

  const handleAnalyzeLead = async (leadId: string) => {
    setAnalyzingId(leadId);
    try { await analyzeLead.mutateAsync({ leadId }); toast.success(t("leadAnalyzed")); }
    catch (error: any) {
      if (error?.message?.includes("Rate limit")) toast.error(t("rateLimitReached"));
      else if (error?.message?.includes("Payment required")) toast.error(t("aiCreditsExhausted"));
      else toast.error(t("errorAnalyzing"));
    } finally { setAnalyzingId(null); }
  };

  const handleBulkAnalyze = async () => {
    if (selectedIds.size === 0) return;
    toast.loading(t("analyzingLeads", { count: selectedIds.size }));
    try {
      const result = await bulkAnalyze.mutateAsync(Array.from(selectedIds));
      toast.dismiss();
      toast.success(result.failed > 0 ? t("leadsAnalyzedWithFailures", { successful: result.successful, failed: result.failed }) : t("leadsAnalyzed", { successful: result.successful }));
      setSelectedIds(new Set());
    } catch { toast.dismiss(); toast.error(t("errorBulkAnalyze")); }
  };

  const handleBulkAnalyzeLinkedIn = async () => {
    if (selectedIds.size === 0) return;
    const selectedLeads = leads?.filter(l => selectedIds.has(l.id) && (l as any).linkedin_url) || [];
    if (selectedLeads.length === 0) { toast.error(t("noLinkedInUrl")); return; }
    toast.loading(t("analyzingLinkedIn", { count: selectedLeads.length }));
    try {
      const entities = selectedLeads.map(l => ({ id: l.id, name: l.name || 'Lead', linkedin_url: (l as any).linkedin_url as string }));
      const result = await bulkAnalyzeLinkedIn.mutateAsync(entities);
      toast.dismiss();
      const successful = result.filter(r => r.success).length;
      const failed = result.filter(r => !r.success).length;
      toast.success(failed > 0 ? t("linkedInAnalyzedWithFailures", { successful, failed }) : t("linkedInAnalyzed", { successful }));
      setSelectedIds(new Set());
    } catch { toast.dismiss(); toast.error(t("errorLinkedInBulk")); }
  };

  const handleExport = () => {
    const selected = leads?.filter(l => selectedIds.has(l.id)) || [];
    const csv = [["Nome", "Email", "Telefone", "Temperatura", "Score"].join(","), ...selected.map(l => [l.name, l.email || "", l.phone || "", l.ai_temperature || "", l.lead_score || ""].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success(t("exportComplete"));
  };

  const filtersActive = !!activeFilterId || Object.keys(filters).some(k => filters[k as keyof SmartLeadsFilters]);

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <FilterSidebar filterGroups={filterGroups} activeFilterId={activeFilterId} onFilterSelect={handleFilterSelect} onClearFilter={() => setActiveFilterId(undefined)} isOpen={showFilterSidebar} onClose={() => setShowFilterSidebar(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader title={t("leads")} count={totalLeads} tabs={pageTabs} activeTab={activeTab} onTabChange={setActiveTab}
          actions={[
            { label: t("import"), icon: <Download className="h-4 w-4" />, onClick: () => toast.info(t("importLeads")), variant: "outline" },
            { label: t("newLead"), icon: <Plus className="h-4 w-4" />, onClick: () => setIsCreateDialogOpen(true) },
          ]}
        />

        <Toolbar searchValue={searchValue} searchPlaceholder={t("searchLeads")} onSearchChange={setSearchValue}
          showFilters={true} filtersActive={filtersActive}
          onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
          onClearFilters={() => { setActiveFilterId(undefined); setFilters({}); }}
          sortOptions={sortOptions} sortValue={sortValue} onSortChange={setSortValue}
          leftActions={<Button variant="ghost" size="sm" onClick={() => setShowFilterSidebar(!showFilterSidebar)} className="gap-2">{showFilterSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}</Button>}
          rightActions={
            <div className="flex items-center gap-2">
              <ColumnSelector columns={LEAD_COLUMNS} visibleColumns={visibleColumns} columnOrder={columnOrder} onVisibleColumnsChange={setVisibleColumns} onColumnOrderChange={setColumnOrder} />
              <Button variant="outline" size="sm" onClick={() => setIsDuplicatesOpen(true)} className="gap-2"><Users className="w-4 h-4" />Duplicados</Button>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2"><RefreshCw className="w-4 h-4" />{t("refresh")}</Button>
            </div>
          }
          className="mt-4"
        />

        {activeTab === "automations" ? (
          <div className="mt-4 flex-1"><EntityAutomationsSection entityType="lead" showHeader={false} /></div>
        ) : activeTab === "smart-lists" ? (
          <div className="mt-4 flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center py-12"><Target className="w-12 h-12 mx-auto mb-4 opacity-20" /><p className="font-medium">{t("smartListsTitle")}</p><p className="text-sm mt-1">{t("smartListsWIP")}</p></div>
          </div>
        ) : activeTab === "import" ? (
          <div className="mt-4 flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center py-12"><Download className="w-12 h-12 mx-auto mb-4 opacity-20" /><p className="font-medium">{t("importLeadsTitle")}</p><p className="text-sm mt-1">{t("importLeadsWIP")}</p></div>
          </div>
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 mt-4 bg-muted/50 rounded-lg border flex-wrap">
                <span className="text-sm text-muted-foreground">{selectedIds.size} {t("selected")}</span>
                <Button variant="outline" size="sm" onClick={handleBulkAnalyze} disabled={bulkAnalyze.isPending}><Sparkles className="w-4 h-4 mr-2" />{t("analyzeAI")}</Button>
                <Button variant="outline" size="sm" onClick={handleBulkAnalyzeLinkedIn} disabled={bulkAnalyzeLinkedIn.isPending}><Linkedin className="w-4 h-4 mr-2" />{t("analyzeLinkedIn")}</Button>
                <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" />{t("export")}</Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}><Trash2 className="w-4 h-4 mr-2" />{t("delete")}</Button>
              </div>
            )}

            <div className="mt-4 rounded-lg border border-border bg-card overflow-hidden flex-1 min-w-0 max-h-[calc(100vh-320px)] overflow-y-auto">
              <StickyTableWrapper minWidth={`${Math.max(1200, totalColumns * 120)}px`}>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn("w-[40px] whitespace-nowrap", stickyHeaderCheckboxStyles)}>
                      <Checkbox checked={allSelected} ref={(el) => { if (el) (el as any).indeterminate = someSelected; }} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead className={cn("min-w-[180px] whitespace-nowrap", stickyHeaderNameStyles)}>{t("col_lead")}</TableHead>
                    {orderedVisibleColumns.map(col => (
                      <TableHead key={col.id} className="whitespace-nowrap">
                        {col.category === "ai" ? <span className="flex items-center gap-1">{col.label}<span className="text-[10px] text-muted-foreground">IA</span></span> : col.label}
                      </TableHead>
                    ))}
                    <TableHead className="w-[100px] whitespace-nowrap"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={totalColumns} className="p-0"><TableSkeleton rows={5} columns={totalColumns} showHeader={false} /></TableCell></TableRow>
                  ) : !filteredLeads.length ? (
                    <TableRow><TableCell colSpan={totalColumns} className="text-center py-8">
                      {searchValue ? <SearchEmptyState query={searchValue} /> : (
                        <EmptyState type="leads" title={t("noLeadsYet")} description={t("noLeadsDesc")} action={{ label: t("addLead"), onClick: () => setIsCreateDialogOpen(true) }} />
                      )}
                    </TableCell></TableRow>
                  ) : (
                    paginatedLeads.map((lead) => {
                      const initials = lead.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <TableRow key={lead.id} className={cn("group transition-colors", selectedIds.has(lead.id) && "bg-muted/50", lead.slaBreach && "bg-destructive/5")}>
                          <TableCell className={cn("w-[40px]", stickyCheckboxStyles)}><Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>
                          <TableCell className={stickyNameStyles}>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9"><AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-medium">{initials}</AvatarFallback></Avatar>
                              <div className="min-w-0">
                                <Link to={`/dashboard/leads/${lead.id}`} className="font-medium text-foreground hover:text-primary hover:underline truncate block">{lead.name}</Link>
                                {(lead as any).company_name && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="w-3 h-3" /><span className="truncate">{(lead as any).company_name}</span></div>}
                              </div>
                            </div>
                          </TableCell>
                          {orderedVisibleColumns.map(col => <TableCell key={col.id}><DynamicTableCell columnId={col.id} entity={lead as any} entityType="lead" /></TableCell>)}
                          <TableCell>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAnalyzeLead(lead.id)} disabled={analyzingId === lead.id}><Sparkles className={cn("w-4 h-4", analyzingId === lead.id && "animate-pulse")} /></Button>
                              <Link to={`/dashboard/leads/${lead.id}`}><Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="w-4 h-4" /></Button></Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover z-50">
                                  <DropdownMenuItem><Reply className="w-4 h-4 mr-2" />{t("sendMessage")}</DropdownMenuItem>
                                  <DropdownMenuItem><Target className="w-4 h-4 mr-2" />{t("createOpportunity")}</DropdownMenuItem>
                                  <DropdownMenuItem><Settings2 className="w-4 h-4 mr-2" />{t("activateAutomation")}</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem><Archive className="w-4 h-4 mr-2" />{t("archive")}</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </StickyTableWrapper>
            </div>

            {totalLeads > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t("show")}</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">{PAGE_SIZE_OPTIONS.map(size => <SelectItem key={size} value={size.toString()}>{size}</SelectItem>)}</SelectContent>
                  </Select>
                  <span>{t("perPage")}</span>
                  <span className="text-muted-foreground/70 ml-2">({t("totalLeads", { count: totalLeads })})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("pageOf", { current: currentPage, total: totalPages || 1 })}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /><ChevronLeft className="h-4 w-4 -ml-2" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /><ChevronRight className="h-4 w-4 -ml-2" /></Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <CreateLeadDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteLeadsTitle", { count: selectedIds.size })}</AlertDialogTitle>
              <AlertDialogDescription>{t("deleteLeadsDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteLeads.isPending ? t("deleting") : t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <UnifiedDuplicateDialog open={isDuplicatesOpen} onOpenChange={setIsDuplicatesOpen} entityType="leads" />
      </div>
    </div>
  );
}
