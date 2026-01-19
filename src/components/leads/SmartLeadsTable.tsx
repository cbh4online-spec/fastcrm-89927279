import { useState, useMemo } from "react";
import { 
  useSmartLeads, 
  useAnalyzeLead, 
  useBulkAnalyzeLeads,
  SmartLeadsFilters,
} from "@/hooks/useSmartLeads";
import { useBulkAnalyzeEntityLinkedIn } from "@/hooks/useEntitySocialMediaAnalysis";
import { useDeleteLeads } from "@/hooks/useLeads";
import { SmartLeadRow } from "./SmartLeadRow";
import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { ColumnSelector, ColumnConfig, useColumnPreferences } from "@/components/common/ColumnSelector";
import { StickyTableWrapper, stickyHeaderCheckboxStyles, stickyHeaderNameStyles } from "@/components/common/StickyTable";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Sparkles, 
  Trash2, 
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Flame,
  Thermometer,
  Snowflake,
  Clock,
  UserX,
  MessageSquare,
  Target,
  Activity,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
// Design System imports
import { 
  EmptyState, 
  SearchEmptyState, 
  LoadingSpinner,
  TableSkeleton,
} from "@/components/design-system";

// Column configurations for leads table - ALL form fields
const LEAD_COLUMNS: ColumnConfig[] = [
  // Basic Information
  { id: "name", label: "Lead", category: "basic", defaultVisible: true },
  { id: "email", label: "Email", category: "basic", defaultVisible: false },
  { id: "phone", label: "Telefone", category: "basic", defaultVisible: false },
  { id: "external_email", label: "Email Externo", category: "basic", defaultVisible: false },
  { id: "fax", label: "Fax", category: "basic", defaultVisible: false },
  { id: "source", label: "Origem", category: "basic", defaultVisible: false },
  { id: "status", label: "Status", category: "basic", defaultVisible: true },
  { id: "tags", label: "Tags", category: "basic", defaultVisible: false },
  { id: "company_name", label: "Empresa", category: "basic", defaultVisible: false },
  { id: "company_status", label: "Estado Empresa", category: "basic", defaultVisible: false },
  
  // Location
  { id: "address", label: "Morada", category: "basic", defaultVisible: false },
  { id: "city", label: "Cidade", category: "basic", defaultVisible: false },
  { id: "county", label: "Concelho", category: "basic", defaultVisible: false },
  { id: "parish", label: "Freguesia", category: "basic", defaultVisible: false },
  { id: "region", label: "Região", category: "basic", defaultVisible: false },
  { id: "postal_code", label: "Código Postal", category: "basic", defaultVisible: false },
  { id: "latitude", label: "Latitude", category: "basic", defaultVisible: false },
  { id: "longitude", label: "Longitude", category: "basic", defaultVisible: false },
  
  // AI & Analysis
  { id: "temperature", label: "Temperatura", category: "ai", defaultVisible: true, description: "Classificação IA" },
  { id: "score", label: "Score", category: "ai", defaultVisible: true, description: "Pontuação 0-100" },
  { id: "ai_lead_type", label: "Tipo Lead IA", category: "ai", defaultVisible: false },
  { id: "next_action", label: "Próxima Ação", category: "ai", defaultVisible: true },
  { id: "insight", label: "Insight IA", category: "ai", defaultVisible: false },
  { id: "ai_analyzed_at", label: "Última Análise", category: "ai", defaultVisible: false },
  
  // Business
  { id: "sla", label: "SLA", category: "business", defaultVisible: true, description: "Tempo desde último contacto" },
  { id: "estimated_value", label: "Potencial €", category: "business", defaultVisible: false },
  { id: "conversion_prob", label: "Prob. %", category: "business", defaultVisible: false },
  { id: "automation", label: "Automação", category: "business", defaultVisible: false },
  { id: "assigned_to", label: "Responsável", category: "business", defaultVisible: false },
  { id: "last_contact_at", label: "Último Contacto", category: "business", defaultVisible: false },
  { id: "business_category", label: "Categoria Negócio", category: "business", defaultVisible: false },
  { id: "services", label: "Serviços", category: "business", defaultVisible: false },
  
  // Company Data
  { id: "tax_id", label: "NIF", category: "business", defaultVisible: false },
  { id: "founding_date", label: "Data Fundação", category: "business", defaultVisible: false },
  { id: "capital_social", label: "Capital Social", category: "business", defaultVisible: false },
  { id: "legal_nature", label: "Natureza Jurídica", category: "business", defaultVisible: false },
  { id: "cae_codes", label: "Códigos CAE", category: "business", defaultVisible: false },
  { id: "cae_description", label: "Descrição CAE", category: "business", defaultVisible: false },
  
  // Online Presence
  { id: "website", label: "Website", category: "relations", defaultVisible: false },
  { id: "linkedin_url", label: "LinkedIn", category: "relations", defaultVisible: false },
  { id: "facebook_url", label: "Facebook", category: "relations", defaultVisible: false },
  { id: "instagram_url", label: "Instagram", category: "relations", defaultVisible: false },
  { id: "twitter_url", label: "Twitter/X", category: "relations", defaultVisible: false },
  
  // Google/Reviews
  { id: "google_place_id", label: "Google Place ID", category: "relations", defaultVisible: false },
  { id: "rating", label: "Avaliação", category: "relations", defaultVisible: false },
  { id: "reviews_count", label: "Nº Reviews", category: "relations", defaultVisible: false },
  { id: "price_level", label: "Nível Preço", category: "relations", defaultVisible: false },
  
  // External IDs
  { id: "external_instagram_id", label: "Instagram ID", category: "relations", defaultVisible: false },
  { id: "external_whatsapp_id", label: "WhatsApp ID", category: "relations", defaultVisible: false },
  { id: "external_username", label: "Username Externo", category: "relations", defaultVisible: false },
  
  // Timestamps
  { id: "created_at", label: "Criado Em", category: "basic", defaultVisible: false },
  { id: "updated_at", label: "Atualizado Em", category: "basic", defaultVisible: false },
];

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
    icon: <Target className="h-4 w-4" />,
    defaultOpen: true,
    items: [
      { id: "status_new", label: "Novos" },
      { id: "status_contacted", label: "Contactados" },
      { id: "status_qualified", label: "Qualificados" },
      { id: "status_proposal", label: "Em proposta" },
      { id: "status_lost", label: "Perdidos" },
    ],
  },
  {
    id: "activity",
    label: "Atividade",
    icon: <Activity className="h-4 w-4" />,
    items: [
      { id: "activity_waiting", label: "À espera de resposta", icon: <Clock className="h-4 w-4" /> },
      { id: "activity_no_reply", label: "Sem resposta há +48h", icon: <UserX className="h-4 w-4 text-amber-500" /> },
      { id: "activity_engaged", label: "Em conversa ativa", icon: <MessageSquare className="h-4 w-4 text-green-500" /> },
    ],
  },
  {
    id: "smart",
    label: "Filtros Inteligentes",
    icon: <Sparkles className="h-4 w-4" />,
    items: [
      { id: "smart_hot", label: "🔥 Prioridade máxima" },
      { id: "smart_ready", label: "✅ Prontos para converter" },
      { id: "smart_nurture", label: "🌱 Para nutrir" },
      { id: "smart_risk", label: "⚠️ Em risco de perder" },
    ],
  },
];

// Page tabs
const pageTabs = [
  { id: "leads", label: "Leads" },
  { id: "smart-lists", label: "Listas Inteligentes" },
  { id: "automations", label: "Automações" },
  { id: "import", label: "Importar" },
];

// Sort options
const sortOptions = [
  { value: "created_desc", label: "Mais recentes" },
  { value: "created_asc", label: "Mais antigos" },
  { value: "score_desc", label: "Maior score" },
  { value: "score_asc", label: "Menor score" },
  { value: "value_desc", label: "Maior potencial" },
  { value: "last_contact_desc", label: "Último contacto" },
];

export function SmartLeadsTable() {
  const [filters, setFilters] = useState<SmartLeadsFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("leads");
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("created_desc");

  // Column visibility and order state with persistence
  const { visibleColumns, setVisibleColumns, columnOrder, setColumnOrder } = useColumnPreferences("leads-table-columns", LEAD_COLUMNS);

  const { data: leads, isLoading, refetch } = useSmartLeads(filters);
  const deleteLeads = useDeleteLeads();
  const analyzeLead = useAnalyzeLead();
  const bulkAnalyze = useBulkAnalyzeLeads();
  const bulkAnalyzeLinkedIn = useBulkAnalyzeEntityLinkedIn('lead');

  // Apply search filter locally - search ALL text fields
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (!searchValue) return leads;
    const lower = searchValue.toLowerCase();
    return leads.filter(l => {
      // All searchable text fields from leads table
      const searchableFields = [
        l.name,
        l.email,
        l.phone,
        (l as any).company_name,
        (l as any).address,
        (l as any).city,
        (l as any).county,
        (l as any).parish,
        (l as any).region,
        (l as any).postal_code,
        (l as any).tax_id,
        l.source,
        l.status,
        (l as any).website,
        (l as any).business_category,
        (l as any).cae_description,
        (l as any).capital_social,
        (l as any).legal_nature,
        l.ai_insight,
        l.ai_next_action,
        (l as any).external_email,
        (l as any).external_username,
        (l as any).linkedin_url,
        (l as any).facebook_url,
        (l as any).instagram_url,
        (l as any).twitter_url,
        (l as any).fax,
        (l as any).company_status,
        (l as any).assigned_to,
        (l as any).ai_lead_type,
      ];
      // Also search in array fields
      const tags = (l as any).tags || [];
      const services = (l as any).services || [];
      const caeCodes = (l as any).cae_codes || [];
      return searchableFields.some(field => 
        field?.toString().toLowerCase().includes(lower)
      ) || tags.some((t: string) => t?.toLowerCase().includes(lower))
        || services.some((s: string) => s?.toLowerCase().includes(lower))
        || caeCodes.some((c: string) => c?.toLowerCase().includes(lower));
    });
  }, [leads, searchValue]);

  // Pagination
  const totalLeads = filteredLeads.length;
  const totalPages = Math.ceil(totalLeads / pageSize);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLeads.slice(startIndex, startIndex + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId === activeFilterId ? undefined : filterId);
  };

  const allSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      const newSelected = new Set(selectedIds);
      paginatedLeads.forEach(l => newSelected.delete(l.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      paginatedLeads.forEach(l => newSelected.add(l.id));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    try {
      await deleteLeads.mutateAsync(Array.from(selectedIds));
      toast.success(`${selectedIds.size} lead(s) eliminados`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error("Erro ao eliminar leads");
    }
  };

  const handleAnalyzeLead = async (leadId: string) => {
    setAnalyzingId(leadId);
    try {
      await analyzeLead.mutateAsync({ leadId });
      toast.success("Lead analisado com sucesso");
    } catch (error: any) {
      if (error?.message?.includes("Rate limit")) {
        toast.error("Limite de requisições atingido. Tente novamente em alguns minutos.");
      } else if (error?.message?.includes("Payment required")) {
        toast.error("Créditos de IA esgotados. Adicione mais créditos para continuar.");
      } else {
        toast.error("Erro ao analisar lead");
      }
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleBulkAnalyze = async () => {
    if (selectedIds.size === 0) return;
    
    toast.loading(`A analisar ${selectedIds.size} leads...`);
    try {
      const result = await bulkAnalyze.mutateAsync(Array.from(selectedIds));
      toast.dismiss();
      toast.success(`${result.successful} leads analisados com sucesso${result.failed > 0 ? `, ${result.failed} falharam` : ""}`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao analisar leads em massa");
    }
  };

  const handleBulkAnalyzeLinkedIn = async () => {
    if (selectedIds.size === 0) return;
    
    const selectedLeads = leads?.filter(l => selectedIds.has(l.id) && (l as any).linkedin_url) || [];
    if (selectedLeads.length === 0) {
      toast.error("Nenhum lead selecionado tem URL do LinkedIn");
      return;
    }
    
    toast.loading(`A analisar LinkedIn de ${selectedLeads.length} leads...`);
    try {
      const entities = selectedLeads.map(l => ({
        id: l.id,
        name: l.name || 'Lead',
        linkedin_url: (l as any).linkedin_url as string
      }));
      const result = await bulkAnalyzeLinkedIn.mutateAsync(entities);
      toast.dismiss();
      const successful = result.filter(r => r.success).length;
      const failed = result.filter(r => !r.success).length;
      toast.success(`${successful} leads analisados${failed > 0 ? `, ${failed} falharam` : ""}`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao analisar LinkedIn em massa");
    }
  };

  const handleExport = () => {
    const selected = leads?.filter(l => selectedIds.has(l.id)) || [];
    const csv = [
      ["Nome", "Email", "Telefone", "Temperatura", "Score"].join(","),
      ...selected.map(l => [l.name, l.email || "", l.phone || "", l.ai_temperature || "", l.lead_score || ""].join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação concluída");
  };

  const filtersActive = !!activeFilterId || Object.keys(filters).some(k => filters[k as keyof SmartLeadsFilters]);

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
          title="Leads"
          count={totalLeads}
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={[
            {
              label: "Importar",
              icon: <Download className="h-4 w-4" />,
              onClick: () => toast.info("Importar leads"),
              variant: "outline",
            },
            {
              label: "Novo Lead",
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setIsCreateDialogOpen(true),
            },
          ]}
        />

        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          searchPlaceholder="Pesquisar leads..."
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
            <div className="flex items-center gap-2">
              <ColumnSelector
                columns={LEAD_COLUMNS}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibleColumnsChange={setVisibleColumns}
                onColumnOrderChange={setColumnOrder}
              />
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
            </div>
          }
          className="mt-4"
        />

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 mt-4 bg-muted/50 rounded-lg border flex-wrap">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selecionado(s)</span>
            <Button variant="outline" size="sm" onClick={handleBulkAnalyze} disabled={bulkAnalyze.isPending}>
              <Sparkles className="w-4 h-4 mr-2" />Analisar com IA
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkAnalyzeLinkedIn} disabled={bulkAnalyzeLinkedIn.isPending}>
              <Linkedin className="w-4 h-4 mr-2" />Analisar LinkedIn
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
        <div className="mt-4 rounded-lg border border-border bg-card overflow-hidden flex-1 min-w-0">
          <StickyTableWrapper minWidth="1200px">
            <TableHeader>
              <TableRow>
                <TableHead className={cn("w-[40px] whitespace-nowrap", stickyHeaderCheckboxStyles)}>
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => { if (el) (el as any).indeterminate = someSelected; }}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className={cn("min-w-[180px] whitespace-nowrap", stickyHeaderNameStyles)}>Lead</TableHead>
                <TableHead className="whitespace-nowrap">Canal</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    Temperatura
                    <span className="text-[10px] text-muted-foreground">IA</span>
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    Score
                    <span className="text-[10px] text-muted-foreground">IA</span>
                  </span>
                </TableHead>
                <TableHead className="min-w-[150px] whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    Próxima Ação
                    <span className="text-[10px] text-muted-foreground">IA</span>
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap">SLA</TableHead>
                {showAdvanced && (
                  <>
                    <TableHead className="whitespace-nowrap">Potencial €</TableHead>
                    <TableHead className="whitespace-nowrap">Prob. %</TableHead>
                    <TableHead className="whitespace-nowrap">Automação</TableHead>
                    <TableHead className="min-w-[180px] whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        Insight
                        <span className="text-[10px] text-muted-foreground">IA</span>
                      </span>
                    </TableHead>
                  </>
                )}
                <TableHead className="w-[100px] whitespace-nowrap"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={showAdvanced ? 13 : 9} className="p-0">
                    <TableSkeleton rows={5} columns={showAdvanced ? 13 : 9} showHeader={false} />
                  </TableCell>
                </TableRow>
              ) : !filteredLeads.length ? (
                <TableRow>
                  <TableCell colSpan={showAdvanced ? 13 : 9} className="text-center py-8">
                    {searchValue ? (
                      <SearchEmptyState query={searchValue} />
                    ) : (
                      <EmptyState
                        type="leads"
                        title="Ainda não há leads"
                        description="Quando entrarem leads, a IA vai organizá-los por ti"
                        action={{
                          label: "Adicionar Lead",
                          onClick: () => setIsCreateDialogOpen(true),
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLeads.map((lead) => (
                  <SmartLeadRow
                    key={lead.id}
                    lead={lead}
                    isSelected={selectedIds.has(lead.id)}
                    onToggleSelect={() => toggleSelect(lead.id)}
                    onAnalyze={() => handleAnalyzeLead(lead.id)}
                    isAnalyzing={analyzingId === lead.id}
                    showAdvanced={showAdvanced}
                  />
                ))
              )}
            </TableBody>
          </StickyTableWrapper>
        </div>

        {/* Pagination */}
        {totalLeads > 0 && (
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
                ({totalLeads} lead{totalLeads !== 1 ? "s" : ""} no total)
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

        {/* Dialogs */}
        <CreateLeadDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar {selectedIds.size} lead(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Os leads selecionados e todas as suas conversas associadas serão permanentemente eliminados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteLeads.isPending ? "A eliminar..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
