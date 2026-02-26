import React, { useState, useMemo } from "react";
import { SmartListsPanel } from "@/components/objects/SmartListsPanel";
import { useSmartCompanies, useAnalyzeCompany, useBulkAnalyzeCompanies, SmartCompaniesFilters } from "@/hooks/useSmartCompanies";
import { useCompanies } from "@/hooks/useCompanies";
import { useBulkSocialMediaAnalysis } from "@/hooks/useSocialMediaAnalysis";
import { SmartCompanyRow } from "./SmartCompanyRow";
import { CreateCompanyDialog } from "./CreateCompanyDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { ColumnSelector, ColumnConfig, useColumnPreferences } from "@/components/common/ColumnSelector";
import { StickyTableWrapper, stickyHeaderCheckboxStyles, stickyHeaderNameStyles } from "@/components/common/StickyTable";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Trash2, Building2, RefreshCw, Download, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft, Flame, Thermometer, Snowflake, Activity, Clock, Users, Factory, Briefcase, Linkedin } from "lucide-react";
import { TableSkeleton, SearchEmptyState, EmptyState } from "@/components/design-system";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function SmartCompaniesTable() {
  const { t } = useTranslation("crm");

  const COMPANY_COLUMNS: ColumnConfig[] = useMemo(() => [
    { id: "name", label: t("col_company"), category: "basic", defaultVisible: true },
    { id: "client_number", label: t("col_clientNumber"), category: "basic", defaultVisible: true },
    { id: "industry", label: t("col_industry"), category: "basic", defaultVisible: true },
    { id: "source", label: t("col_source"), category: "basic", defaultVisible: true },
    { id: "city", label: t("col_city"), category: "basic", defaultVisible: false },
    { id: "size", label: t("col_size"), category: "basic", defaultVisible: false },
    { id: "phone", label: t("col_phone"), category: "basic", defaultVisible: false },
    { id: "email", label: t("col_email"), category: "basic", defaultVisible: false },
    { id: "website", label: t("col_website"), category: "basic", defaultVisible: false },
    { id: "temperature", label: t("col_temperature"), category: "ai", defaultVisible: true, description: t("col_temperatureDesc") },
    { id: "score", label: t("col_score"), category: "ai", defaultVisible: true, description: t("col_scoreDesc") },
    { id: "type", label: t("col_type"), category: "ai", defaultVisible: true, description: t("col_typeDesc") },
    { id: "next_action", label: t("col_nextAction"), category: "ai", defaultVisible: true },
    { id: "insight", label: t("col_insight"), category: "ai", defaultVisible: false },
    { id: "sla", label: t("col_sla"), category: "business", defaultVisible: true, description: t("col_slaDesc") },
    { id: "estimated_value", label: t("col_estimatedValue"), category: "business", defaultVisible: false },
    { id: "conversion_prob", label: t("col_conversionProb"), category: "business", defaultVisible: false },
    { id: "employee_count", label: t("col_employeeCount"), category: "business", defaultVisible: false },
    { id: "annual_revenue", label: t("col_annualRevenue"), category: "business", defaultVisible: false },
    { id: "automation", label: t("col_automation"), category: "business", defaultVisible: false },
    { id: "google_rating", label: t("col_googleRating"), category: "business", defaultVisible: false },
    { id: "contacts_count", label: t("col_contactsCount"), category: "relations", defaultVisible: true, description: t("col_contactsCountDesc") },
    { id: "opportunities_count", label: t("col_opportunitiesCount"), category: "relations", defaultVisible: true, description: t("col_opportunitiesCountDesc") },
    { id: "social_presence", label: t("col_socialPresence"), category: "relations", defaultVisible: false },
  ], [t]);

  const filterGroups: FilterGroup[] = useMemo(() => [
    { id: "temperature", label: t("filterTemperature"), icon: <Thermometer className="h-4 w-4" />, defaultOpen: true, items: [
      { id: "temp_hot", label: t("filterHot"), icon: <Flame className="h-4 w-4 text-red-500" /> },
      { id: "temp_warm", label: t("filterWarm"), icon: <Thermometer className="h-4 w-4 text-orange-500" /> },
      { id: "temp_cold", label: t("filterCold"), icon: <Snowflake className="h-4 w-4 text-blue-500" /> },
    ]},
    { id: "status", label: t("filterStatus"), icon: <Building2 className="h-4 w-4" />, defaultOpen: true, items: [
      { id: "status_active", label: t("filterActiveClients") },
      { id: "status_prospect", label: t("filterProspects") },
      { id: "status_lead", label: t("filterLeads") },
      { id: "status_inactive", label: t("filterInactive") },
    ]},
    { id: "size", label: t("filterSize"), icon: <Users className="h-4 w-4" />, items: [
      { id: "size_micro", label: t("filterSizeMicro") },
      { id: "size_small", label: t("filterSizeSmall") },
      { id: "size_medium", label: t("filterSizeMedium") },
      { id: "size_large", label: t("filterSizeLarge") },
    ]},
    { id: "industry", label: t("filterIndustry"), icon: <Factory className="h-4 w-4" />, items: [
      { id: "ind_tech", label: t("filterIndTech") },
      { id: "ind_services", label: t("filterIndServices") },
      { id: "ind_retail", label: t("filterIndRetail") },
      { id: "ind_manufacturing", label: t("filterIndManufacturing") },
      { id: "ind_other", label: t("filterIndOther") },
    ]},
    { id: "activity", label: t("filterActivity"), icon: <Activity className="h-4 w-4" />, items: [
      { id: "activity_recent", label: t("filterRecentContact"), icon: <Clock className="h-4 w-4" /> },
      { id: "activity_no_contact", label: t("filterNoContact30d") },
      { id: "activity_never", label: t("filterNeverContacted") },
    ]},
  ], [t]);

  const pageTabs = useMemo(() => [
    { id: "companies", label: t("tabCompanies") },
    { id: "smart-lists", label: t("tabSmartLists") },
    { id: "bulk-actions", label: t("tabBulkActions") },
    { id: "import", label: t("tabImport") },
  ], [t]);

  const sortOptions = useMemo(() => [
    { value: "name_asc", label: t("sortNameAsc") },
    { value: "name_desc", label: t("sortNameDesc") },
    { value: "created_desc", label: t("sortNewest") },
    { value: "created_asc", label: t("sortOldestFem") },
    { value: "score_desc", label: t("sortHighestScore") },
    { value: "revenue_desc", label: t("sortHighestRevenue") },
  ], [t]);

  const [filters, setFilters] = useState<SmartCompaniesFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("companies");
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("created_desc");
  
  const { visibleColumns, setVisibleColumns, columnOrder, setColumnOrder } = useColumnPreferences("companies-table-columns", COMPANY_COLUMNS);
  
  const orderedVisibleColumns = COMPANY_COLUMNS
    .filter(col => visibleColumns.has(col.id))
    .sort((a, b) => columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id));

  const { data: companies, isLoading, refetch } = useSmartCompanies(filters);
  const { deleteCompany } = useCompanies();
  const analyze = useAnalyzeCompany();
  const bulkAnalyze = useBulkAnalyzeCompanies();
  const bulkSocialAnalyze = useBulkSocialMediaAnalysis();

  const handleBulkSocialAnalyze = async () => {
    const selected = companies?.filter(c => selectedIds.has(c.id) && c.linkedin_url) || [];
    if (selected.length === 0) { toast.error(t("noLinkedInUrlCompanies")); return; }
    await bulkSocialAnalyze.mutateAsync(selected.map(c => ({ id: c.id, name: c.name, linkedin_url: c.linkedin_url })));
    setSelectedIds(new Set());
  };
  const isBulkSocialAnalyzing = bulkSocialAnalyze.isPending;

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    if (!searchValue) return companies;
    const lower = searchValue.toLowerCase();
    return companies.filter(c => c.name?.toLowerCase().includes(lower) || c.email?.toLowerCase().includes(lower) || c.phone?.toLowerCase().includes(lower) || c.industry?.toLowerCase().includes(lower));
  }, [companies, searchValue]);

  const totalCompanies = filteredCompanies.length;
  const totalPages = Math.ceil(totalCompanies / pageSize);
  const paginatedCompanies = useMemo(() => { const s = (currentPage - 1) * pageSize; return filteredCompanies.slice(s, s + pageSize); }, [filteredCompanies, currentPage, pageSize]);
  const handlePageSizeChange = (newSize: string) => { setPageSize(Number(newSize)); setCurrentPage(1); };
  const handleFilterSelect = (filterId: string) => { setActiveFilterId(filterId === activeFilterId ? undefined : filterId); };

  const allSelected = paginatedCompanies.length > 0 && paginatedCompanies.every(c => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const toggleSelectAll = () => {
    if (allSelected) { const n = new Set(selectedIds); paginatedCompanies.forEach(c => n.delete(c.id)); setSelectedIds(n); }
    else { const n = new Set(selectedIds); paginatedCompanies.forEach(c => n.add(c.id)); setSelectedIds(n); }
  };
  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };

  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try { await analyze.mutateAsync({ companyId: id }); toast.success(t("companyAnalyzed")); }
    catch { toast.error(t("errorAnalyzingCompany")); }
    finally { setAnalyzingId(null); }
  };

  const handleBulkAnalyze = async () => {
    toast.loading(t("analyzingCompanies", { count: selectedIds.size }));
    try { const r = await bulkAnalyze.mutateAsync(Array.from(selectedIds)); toast.dismiss(); toast.success(t("companiesAnalyzed", { successful: r.successful })); setSelectedIds(new Set()); }
    catch { toast.dismiss(); toast.error(t("errorAnalyzingCompany")); }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    toast.loading(t("companiesDeleting", { count: ids.length }));
    try {
      for (const id of ids) await deleteCompany.mutateAsync(id);
      toast.dismiss(); toast.success(t("companiesDeleted", { count: ids.length }));
      setSelectedIds(new Set()); setShowDeleteDialog(false); refetch();
    } catch { toast.dismiss(); toast.error(t("errorDeletingCompanies")); }
  };

  const handleExport = () => {
    const selected = companies?.filter(c => selectedIds.has(c.id)) || [];
    const csv = [["Nome", "Email", "Telefone", "Indústria", "Temperatura", "Score"].join(","), ...selected.map(c => [c.name, c.email || "", c.phone || "", c.industry || "", c.ai_temperature || "", c.company_score || ""].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `empresas-${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success(t("exportComplete"));
  };

  const filtersActive = !!activeFilterId || Object.keys(filters).some(k => filters[k as keyof SmartCompaniesFilters]);

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <FilterSidebar filterGroups={filterGroups} activeFilterId={activeFilterId} onFilterSelect={handleFilterSelect} onClearFilter={() => setActiveFilterId(undefined)} isOpen={showFilterSidebar} onClose={() => setShowFilterSidebar(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader title={t("companies")} count={totalCompanies} tabs={pageTabs} activeTab={activeTab} onTabChange={setActiveTab}
          actions={[
            { label: t("import"), icon: <Download className="h-4 w-4" />, onClick: () => toast.info(t("importCompanies")), variant: "outline" },
            { label: t("newCompany"), icon: <Plus className="h-4 w-4" />, onClick: () => setIsCreateOpen(true) },
          ]}
        />

        <Toolbar searchValue={searchValue} searchPlaceholder={t("searchCompanies")} onSearchChange={setSearchValue}
          showFilters={true} filtersActive={filtersActive}
          onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
          onClearFilters={() => { setActiveFilterId(undefined); setFilters({}); }}
          sortOptions={sortOptions} sortValue={sortValue} onSortChange={setSortValue}
          leftActions={<Button variant="ghost" size="sm" onClick={() => setShowFilterSidebar(!showFilterSidebar)} className="gap-2">{showFilterSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}</Button>}
          rightActions={
            <div className="flex items-center gap-2">
              <ColumnSelector columns={COMPANY_COLUMNS} visibleColumns={visibleColumns} columnOrder={columnOrder} onVisibleColumnsChange={setVisibleColumns} onColumnOrderChange={setColumnOrder} />
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2"><RefreshCw className="w-4 h-4" />{t("refresh")}</Button>
            </div>
          }
          className="mt-4"
        />

        {activeTab === "smart-lists" && (
          <div className="mt-4 flex-1">
            <SmartListsPanel entityType="company"
              fields={[
                { slug: "name", name: t("smartListFieldName"), field_type: "text" },
                { slug: "email", name: t("smartListFieldEmail"), field_type: "email" },
                { slug: "industry", name: t("smartListFieldIndustry"), field_type: "text" },
                { slug: "phone", name: t("smartListFieldPhone"), field_type: "text" },
                { slug: "city", name: t("smartListFieldCity"), field_type: "text" },
                { slug: "source", name: t("smartListFieldSource"), field_type: "text" },
                { slug: "ai_temperature", name: t("smartListFieldTemperature"), field_type: "select", options: { options: ["hot", "warm", "cold"] } },
                { slug: "company_score", name: t("smartListFieldScore"), field_type: "number" },
                { slug: "annual_revenue", name: t("smartListFieldRevenue"), field_type: "currency" },
                { slug: "employee_count", name: t("smartListFieldEmployees"), field_type: "number" },
                { slug: "created_at", name: t("smartListFieldCreatedAt"), field_type: "date" },
              ]}
              records={(filteredCompanies || []) as unknown as Record<string, unknown>[]}
            />
          </div>
        )}

        {activeTab === "companies" && selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 mt-4 bg-muted/50 rounded-lg border flex-wrap">
            <span className="text-sm text-muted-foreground">{selectedIds.size} {t("selectedFem")}</span>
            <Button variant="outline" size="sm" onClick={handleBulkAnalyze} disabled={bulkAnalyze.isPending}><Sparkles className="w-4 h-4 mr-2" />{t("analyzeAI")}</Button>
            <Button variant="outline" size="sm" onClick={handleBulkSocialAnalyze} disabled={isBulkSocialAnalyzing}><Linkedin className="w-4 h-4 mr-2" />{t("analyzeLinkedIn")}</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" />{t("export")}</Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}><Trash2 className="w-4 h-4 mr-2" />{t("delete")}</Button>
          </div>
        )}

        {activeTab === "companies" && (
        <React.Fragment>
        <div className="mt-4 rounded-lg border border-border bg-card overflow-hidden flex-1 min-w-0">
          <StickyTableWrapper minWidth="1400px">
            <TableHeader>
              <TableRow>
                <TableHead className={cn("w-[40px] whitespace-nowrap", stickyHeaderCheckboxStyles)}>
                  <Checkbox checked={allSelected} ref={(el) => { if (el) (el as any).indeterminate = someSelected; }} onCheckedChange={toggleSelectAll} />
                </TableHead>
                {orderedVisibleColumns.map((col, index) => {
                  const isAI = col.category === "ai";
                  const isNameCol = col.id === "name";
                  const minWidth = col.id === "name" ? "min-w-[200px]" : col.id === "industry" ? "min-w-[140px]" : col.id === "source" ? "min-w-[120px]" : col.id === "city" ? "min-w-[120px]" : col.id === "next_action" ? "min-w-[180px]" : col.id === "insight" ? "min-w-[200px]" : col.id === "sla" ? "min-w-[100px]" : "min-w-[100px]";
                  return (
                    <TableHead key={col.id} className={cn(minWidth, "whitespace-nowrap", isNameCol && index === 0 && stickyHeaderNameStyles)}>
                      {isAI ? <span className="flex items-center gap-1">{col.label}<span className="text-[10px] text-muted-foreground">IA</span></span> : col.label}
                    </TableHead>
                  );
                })}
                <TableHead className="w-[100px] whitespace-nowrap"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={visibleColumns.size + 2} className="p-0"><TableSkeleton rows={5} columns={visibleColumns.size + 2} showHeader={false} /></TableCell></TableRow>
              ) : !filteredCompanies.length ? (
                <TableRow><TableCell colSpan={visibleColumns.size + 2} className="text-center py-8">
                  {searchValue ? <SearchEmptyState query={searchValue} /> : (
                    <EmptyState type="companies" title={t("noCompaniesYet")} description={t("noCompaniesDesc")} action={{ label: t("addCompany"), onClick: () => setIsCreateOpen(true) }} />
                  )}
                </TableCell></TableRow>
              ) : (
                paginatedCompanies.map(c => (
                  <SmartCompanyRow key={c.id} company={c} isSelected={selectedIds.has(c.id)} onToggleSelect={() => toggleSelect(c.id)} onAnalyze={() => handleAnalyze(c.id)} isAnalyzing={analyzingId === c.id} columnOrder={orderedVisibleColumns.map(col => col.id)} />
                ))
              )}
            </TableBody>
          </StickyTableWrapper>
        </div>

        {totalCompanies > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("show")}</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">{PAGE_SIZE_OPTIONS.map(size => <SelectItem key={size} value={size.toString()}>{size}</SelectItem>)}</SelectContent>
              </Select>
              <span>{t("perPage")}</span>
              <span className="text-muted-foreground/70 ml-2">({t("totalCompanies", { count: totalCompanies })})</span>
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
        </React.Fragment>
        )}

        <CreateCompanyDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteCompaniesTitle", { count: selectedIds.size })}</AlertDialogTitle>
              <AlertDialogDescription>{t("deleteCompaniesDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("delete")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
