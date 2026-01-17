import { useState, useMemo } from "react";
import { useSmartContacts, useAnalyzeContact, useBulkAnalyzeContacts, SmartContactsFilters } from "@/hooks/useSmartContacts";
import { useContacts } from "@/hooks/useContacts";
import { SmartContactRow } from "./SmartContactRow";
import { CreateContactDialog } from "./CreateContactDialog";
import { BulkActionsBar } from "@/components/crm/unified/BulkActionsBar";
import { BulkEditField } from "@/components/crm/unified/BulkEditDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Download, RefreshCw, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft, Flame, Thermometer, Snowflake, Activity, Clock, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Todos os campos editáveis em massa para contactos
const contactBulkEditFields: BulkEditField[] = [
  // Informação básica
  { key: "name", label: "Nome", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "phone", label: "Telefone", type: "text" },
  { key: "whatsapp_number", label: "WhatsApp", type: "text" },
  { key: "has_whatsapp", label: "Tem WhatsApp", type: "boolean" },
  { key: "company", label: "Empresa", type: "text" },
  { key: "job_title", label: "Cargo", type: "text" },
  { key: "commercial_name", label: "Nome Comercial", type: "text" },
  
  // Localização
  { key: "address", label: "Morada", type: "text" },
  { key: "city", label: "Cidade", type: "text" },
  { key: "postal_code", label: "Código Postal", type: "text" },
  { key: "country", label: "País", type: "text" },
  
  // Classificação e Status
  { key: "source", label: "Origem", type: "select", options: [
    { value: "website", label: "Website" },
    { value: "referral", label: "Referência" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "cold_call", label: "Cold Call" },
    { value: "event", label: "Evento" },
    { value: "import", label: "Importação" },
    { value: "other", label: "Outro" },
  ]},
  { key: "lead_source", label: "Fonte do Lead", type: "text" },
  { key: "client_status", label: "Estado do Cliente", type: "select", options: [
    { value: "prospect", label: "Prospeto" },
    { value: "lead", label: "Lead" },
    { value: "active", label: "Ativo" },
    { value: "churned", label: "Perdido" },
    { value: "inactive", label: "Inativo" },
  ]},
  { key: "client_types", label: "Tipo de Cliente", type: "text" },
  { key: "abc_category", label: "Categoria ABC", type: "select", options: [
    { value: "A", label: "A - Alto valor" },
    { value: "B", label: "B - Médio valor" },
    { value: "C", label: "C - Baixo valor" },
  ]},
  
  // IA e Análise
  { key: "ai_temperature", label: "Temperatura (IA)", type: "select", options: [
    { value: "cold", label: "Frio" },
    { value: "warm", label: "Morno" },
    { value: "hot", label: "Quente" },
  ]},
  { key: "ai_contact_type", label: "Tipo de Contacto (IA)", type: "select", options: [
    { value: "decision_maker", label: "Decisor" },
    { value: "influencer", label: "Influenciador" },
    { value: "champion", label: "Champion" },
    { value: "blocker", label: "Blocker" },
    { value: "end_user", label: "Utilizador Final" },
    { value: "unknown", label: "Desconhecido" },
  ]},
  { key: "ai_next_action_type", label: "Próxima Ação (IA)", type: "select", options: [
    { value: "reply_manual", label: "Responder manualmente" },
    { value: "send_template", label: "Enviar template" },
    { value: "create_opportunity", label: "Criar oportunidade" },
    { value: "activate_automation", label: "Ativar automação" },
    { value: "archive", label: "Arquivar" },
    { value: "follow_up", label: "Follow-up" },
    { value: "schedule_meeting", label: "Agendar reunião" },
    { value: "nurture", label: "Nutrir" },
  ]},
  { key: "contact_score", label: "Score do Contacto", type: "number" },
  { key: "conversion_probability", label: "Probabilidade de Conversão (%)", type: "number" },
  { key: "estimated_value", label: "Valor Estimado (€)", type: "number" },
  
  // Automação e Atribuição
  { key: "automation_active", label: "Automação Ativa", type: "boolean" },
  { key: "assigned_to", label: "Responsável", type: "text" },
  { key: "is_primary_contact", label: "Contacto Principal", type: "boolean" },
  
  // Dados fiscais
  { key: "tax_id", label: "NIF", type: "text" },
  { key: "entity_type", label: "Tipo de Entidade", type: "select", options: [
    { value: "consumidor_final", label: "Consumidor Final" },
    { value: "eni", label: "ENI" },
    { value: "empresa", label: "Empresa" },
  ]},
  { key: "fiscal_regime", label: "Regime Fiscal", type: "text" },
  { key: "is_fiscal_address", label: "Morada Fiscal", type: "boolean" },
  
  // Negócio
  { key: "business_area", label: "Área de Negócio", type: "text" },
  { key: "cae_code", label: "Código CAE", type: "text" },
  { key: "cae_description", label: "Descrição CAE", type: "text" },
  
  // Financeiro
  { key: "credit_active", label: "Crédito Ativo", type: "boolean" },
  { key: "credit_limit", label: "Limite de Crédito (€)", type: "number" },
  { key: "payment_conditions", label: "Condições de Pagamento", type: "text" },
  { key: "preferred_payment_method", label: "Método de Pagamento Preferido", type: "select", options: [
    { value: "transfer", label: "Transferência" },
    { value: "card", label: "Cartão" },
    { value: "mbway", label: "MB Way" },
    { value: "check", label: "Cheque" },
    { value: "cash", label: "Dinheiro" },
  ]},
  { key: "average_ticket", label: "Ticket Médio (€)", type: "number" },
  { key: "total_revenue", label: "Receita Total (€)", type: "number" },
  
  // Histórico de vendas
  { key: "sales_2023", label: "Vendas 2023 (€)", type: "number" },
  { key: "sales_2024", label: "Vendas 2024 (€)", type: "number" },
  { key: "sales_2025", label: "Vendas 2025 (€)", type: "number" },
  { key: "sales_2026", label: "Vendas 2026 (€)", type: "number" },
  
  // Redes sociais
  { key: "linkedin_url", label: "LinkedIn", type: "text" },
  { key: "facebook_url", label: "Facebook", type: "text" },
  { key: "instagram_url", label: "Instagram", type: "text" },
  { key: "twitter_url", label: "Twitter/X", type: "text" },
  
  // Notas
  { key: "notes", label: "Notas", type: "text" },
];

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
    icon: <UserCheck className="h-4 w-4" />,
    defaultOpen: true,
    items: [
      { id: "status_active", label: "Clientes Ativos" },
      { id: "status_prospect", label: "Prospetos" },
      { id: "status_lead", label: "Leads" },
      { id: "status_inactive", label: "Inativos" },
      { id: "status_churned", label: "Perdidos" },
    ],
  },
  {
    id: "activity",
    label: "Atividade",
    icon: <Activity className="h-4 w-4" />,
    items: [
      { id: "activity_recent", label: "Contactados recentemente", icon: <Clock className="h-4 w-4" /> },
      { id: "activity_no_contact", label: "Sem contacto há +30 dias", icon: <UserX className="h-4 w-4" /> },
      { id: "activity_never", label: "Nunca contactados" },
    ],
  },
  {
    id: "category",
    label: "Categoria ABC",
    icon: <Users className="h-4 w-4" />,
    items: [
      { id: "cat_a", label: "Categoria A (Alto valor)" },
      { id: "cat_b", label: "Categoria B (Médio valor)" },
      { id: "cat_c", label: "Categoria C (Baixo valor)" },
    ],
  },
];

// Page tabs
const pageTabs = [
  { id: "contacts", label: "Contactos" },
  { id: "smart-lists", label: "Listas Inteligentes" },
  { id: "bulk-actions", label: "Ações em Massa" },
  { id: "import", label: "Importar" },
];

// Sort options
const sortOptions = [
  { value: "name_asc", label: "Nome (A-Z)" },
  { value: "name_desc", label: "Nome (Z-A)" },
  { value: "created_desc", label: "Mais recentes" },
  { value: "created_asc", label: "Mais antigos" },
  { value: "score_desc", label: "Maior score" },
  { value: "score_asc", label: "Menor score" },
];

export function SmartContactsTable() {
  const [filters, setFilters] = useState<SmartContactsFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("contacts");
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("created_desc");

  const { data: contacts, isLoading, refetch } = useSmartContacts(filters);
  const { deleteContacts, addTagsToContacts, bulkUpdateContacts } = useContacts();
  const analyze = useAnalyzeContact();
  const bulkAnalyze = useBulkAnalyzeContacts();

  // Apply search filter locally
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!searchValue) return contacts;
    const lower = searchValue.toLowerCase();
    return contacts.filter(c => 
      c.name?.toLowerCase().includes(lower) ||
      c.email?.toLowerCase().includes(lower) ||
      c.phone?.toLowerCase().includes(lower) ||
      c.company?.toLowerCase().includes(lower)
    );
  }, [contacts, searchValue]);

  // Paginação
  const totalContacts = filteredContacts.length;
  const totalPages = Math.ceil(totalContacts / pageSize);
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredContacts.slice(startIndex, startIndex + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  // Reset para página 1 quando mudar o filtro ou tamanho da página
  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId === activeFilterId ? undefined : filterId);
    // TODO: Apply filter logic based on filterId
  };

  const allSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      const newSelected = new Set(selectedIds);
      paginatedContacts.forEach(c => newSelected.delete(c.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      paginatedContacts.forEach(c => newSelected.add(c.id));
      setSelectedIds(newSelected);
    }
  };
  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };

  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try { await analyze.mutateAsync({ contactId: id }); toast.success("Contacto analisado"); }
    catch { toast.error("Erro ao analisar"); }
    finally { setAnalyzingId(null); }
  };

  const handleBulkAnalyze = async () => {
    toast.loading(`A analisar ${selectedIds.size}...`);
    try { const r = await bulkAnalyze.mutateAsync(Array.from(selectedIds)); toast.dismiss(); toast.success(`${r.successful} analisados`); setSelectedIds(new Set()); }
    catch { toast.dismiss(); toast.error("Erro"); }
  };

  const handleBulkDelete = async () => {
    await deleteContacts.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleAddTags = async (tags: string[]) => {
    await addTagsToContacts.mutateAsync({ ids: Array.from(selectedIds), tags });
    setSelectedIds(new Set());
  };

  const handleBulkEdit = async (changes: Record<string, unknown>) => {
    await bulkUpdateContacts.mutateAsync({ ids: Array.from(selectedIds), changes });
    toast.success(`${selectedIds.size} contactos atualizados`);
    setSelectedIds(new Set());
    refetch();
  };

  const handleExport = () => {
    const selected = contacts?.filter(c => selectedIds.has(c.id)) || [];
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
    toast.success("Exportação concluída");
  };

  const filtersActive = !!activeFilterId || Object.keys(filters).some(k => filters[k as keyof SmartContactsFilters]);

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
          title="Contactos"
          count={totalContacts}
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={[
            {
              label: "Importar",
              icon: <Download className="h-4 w-4" />,
              onClick: () => toast.info("Importar contactos"),
              variant: "outline",
            },
            {
              label: "Novo Contacto",
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setIsCreateOpen(true),
            },
          ]}
        />

        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          searchPlaceholder="Pesquisar contactos..."
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
          <BulkActionsBar
            entityType="contacts"
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            onDelete={handleBulkDelete}
            onExport={handleExport}
            onAddTags={handleAddTags}
            onBulkEdit={handleBulkEdit}
            editableFields={contactBulkEditFields}
          />
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
                <TableHead className="min-w-[180px]">Contacto</TableHead>
                <TableHead>Empresa</TableHead>
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
                  <TableCell colSpan={showAdvanced ? 14 : 10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      A carregar...
                    </div>
                  </TableCell>
                </TableRow>
              ) : !filteredContacts.length ? (
                <TableRow>
                  <TableCell colSpan={showAdvanced ? 14 : 10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Users className="w-12 h-12 opacity-50" />
                      <p className="text-lg font-medium">
                        {searchValue ? "Nenhum contacto encontrado" : "Quando entrarem contactos, a IA vai organizá-los por ti"}
                      </p>
                      <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Contacto
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedContacts.map(c => (
                  <SmartContactRow 
                    key={c.id} 
                    contact={c} 
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
        {totalContacts > 0 && (
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
                ({totalContacts} contacto{totalContacts !== 1 ? "s" : ""} no total)
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

        <CreateContactDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>
    </div>
  );
}
