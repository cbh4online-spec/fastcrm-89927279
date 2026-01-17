import { useState, useMemo } from "react";
import { useSmartCompanies, useAnalyzeCompany, useBulkAnalyzeCompanies, SmartCompaniesFilters } from "@/hooks/useSmartCompanies";
import { useCompanies } from "@/hooks/useCompanies";
import { SmartCompanyRow } from "./SmartCompanyRow";
import { CreateCompanyDialog } from "./CreateCompanyDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Sparkles, Trash2, Building2, RefreshCw, Download, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft, Flame, Thermometer, Snowflake, Activity, Clock, Users, Factory, Briefcase } from "lucide-react";
import { TableSkeleton, SearchEmptyState, EmptyState } from "@/components/design-system";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Filter groups for sidebar
const filterGroups: FilterGroup[] = [
  {
    id: "temperature",
    label: "Temperatura",
    icon: <Thermometer className="h-4 w-4" />,
    defaultOpen: true,
    items: [
      { id: "temp_hot", label: "Quente", icon: <Flame className="h-4 w-4 text-red-500" /> },
      { id: "temp_warm", label: "Morno", icon: <Thermometer className="h-4 w-4 text-orange-500" /> },
      { id: "temp_cold", label: "Frio", icon: <Snowflake className="h-4 w-4 text-blue-500" /> },
    ],
  },
  {
    id: "status",
    label: "Estado",
    icon: <Building2 className="h-4 w-4" />,
    defaultOpen: true,
    items: [
      { id: "status_active", label: "Clientes Ativos" },
      { id: "status_prospect", label: "Prospetos" },
      { id: "status_lead", label: "Leads" },
      { id: "status_inactive", label: "Inativos" },
    ],
  },
  {
    id: "size",
    label: "Dimensão",
    icon: <Users className="h-4 w-4" />,
    items: [
      { id: "size_micro", label: "Micro (1-9)" },
      { id: "size_small", label: "Pequena (10-49)" },
      { id: "size_medium", label: "Média (50-249)" },
      { id: "size_large", label: "Grande (250+)" },
    ],
  },
  {
    id: "industry",
    label: "Indústria",
    icon: <Factory className="h-4 w-4" />,
    items: [
      { id: "ind_tech", label: "Tecnologia" },
      { id: "ind_services", label: "Serviços" },
      { id: "ind_retail", label: "Retalho" },
      { id: "ind_manufacturing", label: "Indústria" },
      { id: "ind_other", label: "Outros" },
    ],
  },
  {
    id: "activity",
    label: "Atividade",
    icon: <Activity className="h-4 w-4" />,
    items: [
      { id: "activity_recent", label: "Contactadas recentemente", icon: <Clock className="h-4 w-4" /> },
      { id: "activity_no_contact", label: "Sem contacto há +30 dias" },
      { id: "activity_never", label: "Nunca contactadas" },
    ],
  },
];

// Page tabs
const pageTabs = [
  { id: "companies", label: "Empresas" },
  { id: "smart-lists", label: "Listas Inteligentes" },
  { id: "bulk-actions", label: "Ações em Massa" },
  { id: "import", label: "Importar" },
];

// Sort options
const sortOptions = [
  { value: "name_asc", label: "Nome (A-Z)" },
  { value: "name_desc", label: "Nome (Z-A)" },
  { value: "created_desc", label: "Mais recentes" },
  { value: "created_asc", label: "Mais antigas" },
  { value: "score_desc", label: "Maior score" },
  { value: "revenue_desc", label: "Maior receita" },
];

export function SmartCompaniesTable() {
  const [filters, setFilters] = useState<SmartCompaniesFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("companies");
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("created_desc");

  const { data: companies, isLoading, refetch } = useSmartCompanies(filters);
  const { deleteCompany } = useCompanies();
  const analyze = useAnalyzeCompany();
  const bulkAnalyze = useBulkAnalyzeCompanies();

  // Apply search filter locally
  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    if (!searchValue) return companies;
    const lower = searchValue.toLowerCase();
    return companies.filter(c => 
      c.name?.toLowerCase().includes(lower) ||
      c.email?.toLowerCase().includes(lower) ||
      c.phone?.toLowerCase().includes(lower) ||
      c.industry?.toLowerCase().includes(lower)
    );
  }, [companies, searchValue]);

  // Pagination
  const totalCompanies = filteredCompanies.length;
  const totalPages = Math.ceil(totalCompanies / pageSize);
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCompanies.slice(startIndex, startIndex + pageSize);
  }, [filteredCompanies, currentPage, pageSize]);

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId === activeFilterId ? undefined : filterId);
  };

  const allSelected = paginatedCompanies.length > 0 && paginatedCompanies.every(c => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      const newSelected = new Set(selectedIds);
      paginatedCompanies.forEach(c => newSelected.delete(c.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      paginatedCompanies.forEach(c => newSelected.add(c.id));
      setSelectedIds(newSelected);
    }
  };
  
  const toggleSelect = (id: string) => { 
    const n = new Set(selectedIds); 
    n.has(id) ? n.delete(id) : n.add(id); 
    setSelectedIds(n); 
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try { await analyze.mutateAsync({ companyId: id }); toast.success("Empresa analisada"); }
    catch { toast.error("Erro ao analisar"); }
    finally { setAnalyzingId(null); }
  };

  const handleBulkAnalyze = async () => {
    toast.loading(`A analisar ${selectedIds.size}...`);
    try { const r = await bulkAnalyze.mutateAsync(Array.from(selectedIds)); toast.dismiss(); toast.success(`${r.successful} analisadas`); setSelectedIds(new Set()); }
    catch { toast.dismiss(); toast.error("Erro"); }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    toast.loading(`A eliminar ${ids.length} empresas...`);
    try {
      for (const id of ids) {
        await deleteCompany.mutateAsync(id);
      }
      toast.dismiss();
      toast.success(`${ids.length} empresa(s) eliminada(s)`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      refetch();
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao eliminar empresas");
    }
  };

  const handleExport = () => {
    const selected = companies?.filter(c => selectedIds.has(c.id)) || [];
    const csv = [
      ["Nome", "Email", "Telefone", "Indústria", "Temperatura", "Score"].join(","),
      ...selected.map(c => [c.name, c.email || "", c.phone || "", c.industry || "", c.ai_temperature || "", c.company_score || ""].join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `empresas-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação concluída");
  };

  const filtersActive = !!activeFilterId || Object.keys(filters).some(k => filters[k as keyof SmartCompaniesFilters]);

  return (
    <div className="flex h-full -m-6">
      {/* Filter Sidebar */}
      <FilterSidebar
        filterGroups={filterGroups}
        activeFilterId={activeFilterId}
        onFilterSelect={handleFilterSelect}
        onClearFilter={() => setActiveFilterId(undefined)}
        isOpen={showFilterSidebar}
        onClose={() => setShowFilterSidebar(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 p-6">
        {/* Page Header */}
        <PageHeader
          title="Empresas"
          count={totalCompanies}
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={[
            {
              label: "Importar",
              icon: <Download className="h-4 w-4" />,
              onClick: () => toast.info("Importar empresas"),
              variant: "outline",
            },
            {
              label: "Nova Empresa",
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setIsCreateOpen(true),
            },
          ]}
        />

        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          searchPlaceholder="Pesquisar empresas..."
          onSearchChange={setSearchValue}
          showFilters={true}
          filtersActive={filtersActive}
          onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
          onClearFilters={() => {
            setActiveFilterId(undefined);
            setFilters({});
          }}
          sortOptions={sortOptions}
          sortValue={sortValue}
          onSortChange={setSortValue}
          leftActions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilterSidebar(!showFilterSidebar)}
              className="gap-2"
            >
              {showFilterSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          }
          rightActions={
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          }
          className="mt-4"
        />

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 mt-4 bg-muted/50 rounded-lg border">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selecionada(s)</span>
            <Button variant="outline" size="sm" onClick={handleBulkAnalyze} disabled={bulkAnalyze.isPending}>
              <Sparkles className="w-4 h-4 mr-2" />Analisar com IA
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />Exportar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-4 h-4 mr-2" />Eliminar
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="mt-4 rounded-lg border border-border bg-card overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox 
                    checked={allSelected} 
                    ref={(el) => { if (el) (el as any).indeterminate = someSelected; }} 
                    onCheckedChange={toggleSelectAll} 
                  />
                </TableHead>
                <TableHead className="min-w-[180px]">Empresa</TableHead>
                <TableHead>Indústria</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>
                  <span className="flex items-center gap-1">
                    Temperatura
                    <span className="text-[10px] text-muted-foreground">IA</span>
                  </span>
                </TableHead>
                <TableHead>
                  <span className="flex items-center gap-1">
                    Score
                    <span className="text-[10px] text-muted-foreground">IA</span>
                  </span>
                </TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="min-w-[150px]">
                  <span className="flex items-center gap-1">
                    Próxima Ação
                    <span className="text-[10px] text-muted-foreground">IA</span>
                  </span>
                </TableHead>
                <TableHead>SLA</TableHead>
                {showAdvanced && (
                  <>
                    <TableHead>Potencial €</TableHead>
                    <TableHead>Prob. %</TableHead>
                    <TableHead>Funcionários</TableHead>
                    <TableHead>Automação</TableHead>
                    <TableHead className="min-w-[180px]">
                      <span className="flex items-center gap-1">
                        Insight
                        <span className="text-[10px] text-muted-foreground">IA</span>
                      </span>
                    </TableHead>
                  </>
                )}
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={showAdvanced ? 15 : 10} className="p-0">
                    <TableSkeleton rows={5} columns={showAdvanced ? 15 : 10} showHeader={false} />
                  </TableCell>
                </TableRow>
              ) : !filteredCompanies.length ? (
                <TableRow>
                  <TableCell colSpan={showAdvanced ? 15 : 10} className="text-center py-8">
                    {searchValue ? (
                      <SearchEmptyState query={searchValue} />
                    ) : (
                      <EmptyState
                        type="companies"
                        title="Ainda não há empresas"
                        description="Quando entrarem empresas, a IA vai organizá-las por ti"
                        action={{
                          label: "Adicionar Empresa",
                          onClick: () => setIsCreateOpen(true),
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCompanies.map(c => (
                  <SmartCompanyRow 
                    key={c.id} 
                    company={c} 
                    isSelected={selectedIds.has(c.id)} 
                    onToggleSelect={() => toggleSelect(c.id)} 
                    onAnalyze={() => handleAnalyze(c.id)} 
                    isAnalyzing={analyzingId === c.id} 
                    showAdvanced={showAdvanced} 
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalCompanies > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mostrar</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>por página</span>
              <span className="text-muted-foreground/70 ml-2">
                ({totalCompanies} empresa{totalCompanies !== 1 ? "s" : ""} no total)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages || 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <ChevronLeft className="h-4 w-4 -ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4 -ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <CreateCompanyDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar {selectedIds.size} empresa(s)?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleBulkDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
