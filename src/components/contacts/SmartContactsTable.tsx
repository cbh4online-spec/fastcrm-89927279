import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSmartContacts, useAnalyzeContact, useBulkAnalyzeContacts, SmartContactsFilters, SmartContact } from "@/hooks/useSmartContacts";
import { useBulkAnalyzeEntityLinkedIn } from "@/hooks/useEntitySocialMediaAnalysis";
import { useContacts } from "@/hooks/useContacts";
import { CreateContactDialog } from "./CreateContactDialog";
import { BulkActionsBar } from "@/components/crm/unified/BulkActionsBar";
import { BulkEditField } from "@/components/crm/unified/BulkEditDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { ColumnSelector, ColumnConfig, useColumnPreferences } from "@/components/common/ColumnSelector";
import { StickyTableWrapper, stickyHeaderCheckboxStyles, stickyHeaderNameStyles, stickyCheckboxStyles, stickyNameStyles } from "@/components/common/StickyTable";
import { DynamicTableCell } from "@/components/common/DynamicTableCell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Plus, Users, Download, RefreshCw, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft, Flame, Thermometer, Snowflake, Activity, Clock, UserCheck, UserX, Linkedin, Sparkles, ExternalLink, MoreHorizontal, Reply, Target, Settings2, Archive, Building2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
// Design System imports
import { EmptyState, SearchEmptyState, TableSkeleton } from "@/components/design-system";

// Column configurations for contacts table - ALL form fields
const CONTACT_COLUMNS: ColumnConfig[] = [
  // Basic Information
  { id: "name", label: "Contacto", category: "basic", defaultVisible: true },
  { id: "client_number", label: "Nº Cliente", category: "basic", defaultVisible: true },
  { id: "email", label: "Email", category: "basic", defaultVisible: false },
  { id: "phone", label: "Telefone", category: "basic", defaultVisible: false },
  { id: "whatsapp_number", label: "WhatsApp", category: "basic", defaultVisible: false },
  { id: "has_whatsapp", label: "Tem WhatsApp", category: "basic", defaultVisible: false },
  { id: "company", label: "Empresa", category: "basic", defaultVisible: true },
  { id: "job_title", label: "Cargo", category: "basic", defaultVisible: false },
  { id: "commercial_name", label: "Nome Comercial", category: "basic", defaultVisible: false },
  { id: "source", label: "Origem", category: "basic", defaultVisible: true },
  { id: "lead_source", label: "Fonte do Lead", category: "basic", defaultVisible: false },
  { id: "tags", label: "Tags", category: "basic", defaultVisible: false },
  { id: "notes", label: "Notas", category: "basic", defaultVisible: false },
  { id: "is_primary_contact", label: "Contacto Principal", category: "basic", defaultVisible: false },
  
  // Location
  { id: "address", label: "Morada", category: "basic", defaultVisible: false },
  { id: "city", label: "Cidade", category: "basic", defaultVisible: false },
  { id: "postal_code", label: "Código Postal", category: "basic", defaultVisible: false },
  { id: "country", label: "País", category: "basic", defaultVisible: false },
  { id: "is_fiscal_address", label: "Morada Fiscal", category: "basic", defaultVisible: false },
  
  // AI & Analysis
  { id: "temperature", label: "Temperatura", category: "ai", defaultVisible: true, description: "Classificação IA" },
  { id: "score", label: "Score", category: "ai", defaultVisible: true, description: "Pontuação 0-100" },
  { id: "type", label: "Tipo", category: "ai", defaultVisible: true, description: "Decisor/Influenciador/etc" },
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
  { id: "last_purchase_date", label: "Última Compra", category: "business", defaultVisible: false },
  { id: "activity_start_date", label: "Início Atividade", category: "business", defaultVisible: false },
  { id: "client_since", label: "Cliente Desde", category: "business", defaultVisible: false },
  
  // Client Classification
  { id: "abc_category", label: "Categoria ABC", category: "business", defaultVisible: false },
  { id: "client_status", label: "Estado Cliente", category: "business", defaultVisible: false },
  { id: "client_types", label: "Tipo Cliente", category: "business", defaultVisible: false },
  { id: "entity_type", label: "Tipo Entidade", category: "business", defaultVisible: false },
  
  // Fiscal
  { id: "tax_id", label: "NIF", category: "business", defaultVisible: false },
  { id: "fiscal_regime", label: "Regime Fiscal", category: "business", defaultVisible: false },
  { id: "business_area", label: "Área de Negócio", category: "business", defaultVisible: false },
  { id: "cae_code", label: "Código CAE", category: "business", defaultVisible: false },
  { id: "cae_description", label: "Descrição CAE", category: "business", defaultVisible: false },
  
  // Financial
  { id: "credit_active", label: "Crédito Ativo", category: "business", defaultVisible: false },
  { id: "credit_limit", label: "Limite Crédito €", category: "business", defaultVisible: false },
  { id: "payment_conditions", label: "Condições Pagamento", category: "business", defaultVisible: false },
  { id: "preferred_payment_method", label: "Método Pagamento", category: "business", defaultVisible: false },
  { id: "average_ticket", label: "Ticket Médio €", category: "business", defaultVisible: false },
  { id: "total_revenue", label: "Receita Total €", category: "business", defaultVisible: false },
  { id: "sales_2023", label: "Vendas 2023 €", category: "business", defaultVisible: false },
  { id: "sales_2024", label: "Vendas 2024 €", category: "business", defaultVisible: false },
  { id: "sales_2025", label: "Vendas 2025 €", category: "business", defaultVisible: false },
  { id: "sales_2026", label: "Vendas 2026 €", category: "business", defaultVisible: false },
  
  // Social / Relations
  { id: "linkedin_url", label: "LinkedIn", category: "relations", defaultVisible: false },
  { id: "facebook_url", label: "Facebook", category: "relations", defaultVisible: false },
  { id: "instagram_url", label: "Instagram", category: "relations", defaultVisible: false },
  { id: "twitter_url", label: "Twitter/X", category: "relations", defaultVisible: false },
  
  // Timestamps
  { id: "created_at", label: "Criado Em", category: "basic", defaultVisible: false },
  { id: "updated_at", label: "Atualizado Em", category: "basic", defaultVisible: false },
];

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

  // Column visibility and order state with persistence
  const { visibleColumns, setVisibleColumns, columnOrder, setColumnOrder } = useColumnPreferences("contacts-table-columns", CONTACT_COLUMNS);

  // Compute ordered visible columns (excluding name which is always first)
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
  }, [visibleColumns, columnOrder]);

  const totalColumns = orderedVisibleColumns.length + 3; // +3 for checkbox, name, actions

  const { data: contacts, isLoading, refetch } = useSmartContacts(filters);
  const { deleteContacts, addTagsToContacts, bulkUpdateContacts } = useContacts();
  const analyze = useAnalyzeContact();
  const bulkAnalyze = useBulkAnalyzeContacts();
  const bulkAnalyzeLinkedIn = useBulkAnalyzeEntityLinkedIn('contact');

  // Apply search filter locally - search ALL text fields
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!searchValue) return contacts;
    const lower = searchValue.toLowerCase();
    return contacts.filter(c => {
      // All searchable text fields from contacts table
      const searchableFields = [
        c.name,
        c.email,
        c.phone,
        c.company,
        c.job_title,
        (c as any).commercial_name,
        c.source,
        (c as any).lead_source,
        (c as any).address,
        (c as any).city,
        (c as any).postal_code,
        (c as any).country,
        (c as any).tax_id,
        (c as any).notes,
        (c as any).business_area,
        (c as any).cae_code,
        (c as any).cae_description,
        (c as any).whatsapp_number,
        (c as any).linkedin_url,
        (c as any).facebook_url,
        (c as any).instagram_url,
        (c as any).twitter_url,
        c.ai_insight,
        c.ai_next_action,
        (c as any).client_status,
        (c as any).client_types,
        (c as any).abc_category,
        (c as any).fiscal_regime,
        (c as any).payment_conditions,
        (c as any).preferred_payment_method,
        (c as any).entity_type,
        (c as any).assigned_to,
      ];
      // Also search in tags array
      const tags = (c as any).tags || [];
      return searchableFields.some(field => 
        field?.toString().toLowerCase().includes(lower)
      ) || tags.some((tag: string) => tag?.toLowerCase().includes(lower));
    });
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

  const handleBulkAnalyzeLinkedIn = async () => {
    const selected = contacts?.filter(c => selectedIds.has(c.id)) || [];
    const withLinkedIn = selected.filter(c => (c as any).linkedin_url);
    if (withLinkedIn.length === 0) {
      toast.error("Nenhum contacto selecionado tem URL LinkedIn");
      return;
    }
    await bulkAnalyzeLinkedIn.mutateAsync(
      withLinkedIn.map(c => ({ id: c.id, name: c.name, linkedin_url: (c as any).linkedin_url }))
    );
    setSelectedIds(new Set());
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

      {/* Main Content - Nexus Style */}
      <div className="flex-1 flex flex-col min-w-0 p-6 bg-gradient-to-br from-background via-background to-muted/20">
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
            <div className="flex items-center gap-2">
              <ColumnSelector
                columns={CONTACT_COLUMNS}
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

        {/* Table - Nexus Style */}
        <div className="mt-4 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden flex-1 min-w-0 shadow-sm">
          <StickyTableWrapper minWidth={`${Math.max(1200, totalColumns * 120)}px`}>
            <TableHeader>
              <TableRow>
                <TableHead className={cn("w-[40px] whitespace-nowrap", stickyHeaderCheckboxStyles)}>
                  <Checkbox 
                    checked={allSelected} 
                    ref={(el) => { if (el) (el as any).indeterminate = someSelected; }} 
                    onCheckedChange={toggleSelectAll} 
                  />
                </TableHead>
                <TableHead className={cn("min-w-[180px] whitespace-nowrap", stickyHeaderNameStyles)}>Contacto</TableHead>
                {orderedVisibleColumns.map(col => (
                  <TableHead key={col.id} className="whitespace-nowrap">
                    {col.category === "ai" ? (
                      <span className="flex items-center gap-1">
                        {col.label}
                        <span className="text-[10px] text-muted-foreground">IA</span>
                      </span>
                    ) : (
                      col.label
                    )}
                  </TableHead>
                ))}
                <TableHead className="w-[100px] whitespace-nowrap"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={totalColumns} className="p-0">
                    <TableSkeleton rows={5} columns={totalColumns} showHeader={false} />
                  </TableCell>
                </TableRow>
              ) : !filteredContacts.length ? (
                <TableRow>
                  <TableCell colSpan={totalColumns} className="text-center py-8">
                    {searchValue ? (
                      <SearchEmptyState query={searchValue} />
                    ) : (
                      <EmptyState
                        type="contacts"
                        title="Ainda não há contactos"
                        description="Quando entrarem contactos, a IA vai organizá-los por ti"
                        action={{
                          label: "Adicionar Contacto",
                          onClick: () => setIsCreateOpen(true),
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedContacts.map(contact => {
                  const initials = contact.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  // Temperature gradient for avatar
                  const tempGradient = contact.ai_temperature === 'hot' 
                    ? 'from-red-500/80 to-orange-500' 
                    : contact.ai_temperature === 'warm' 
                    ? 'from-amber-500/80 to-yellow-500' 
                    : 'from-blue-500/80 to-cyan-500';

                  return (
                    <TableRow
                      key={contact.id} 
                      className={cn(
                        "group transition-colors",
                        selectedIds.has(contact.id) && "bg-muted/50",
                        contact.slaBreach && "bg-destructive/5"
                      )}
                    >
                      {/* Checkbox */}
                      <TableCell className={cn("w-[40px]", stickyCheckboxStyles)}>
                        <Checkbox
                          checked={selectedIds.has(contact.id)}
                          onCheckedChange={() => toggleSelect(contact.id)}
                        />
                      </TableCell>

                      {/* Contact Name (always visible, sticky) - Nexus Style */}
                      <TableCell className={stickyNameStyles}>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                              <AvatarFallback className={cn(
                                "bg-gradient-to-br text-white text-xs font-semibold",
                                tempGradient
                              )}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {contact.ai_temperature === 'hot' && (
                              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link 
                              to={`/dashboard/contacts/${contact.id}`}
                              className="font-medium text-foreground hover:text-primary transition-colors truncate block"
                            >
                              {contact.name}
                            </Link>
                            {contact.job_title && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Briefcase className="w-3 h-3" />
                                <span className="truncate">{contact.job_title}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Dynamic columns */}
                      {orderedVisibleColumns.map(col => (
                        <TableCell key={col.id}>
                          <DynamicTableCell 
                            columnId={col.id} 
                            entity={contact as any} 
                            entityType="contact" 
                          />
                        </TableCell>
                      ))}

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => handleAnalyze(contact.id)}
                            disabled={analyzingId === contact.id}
                          >
                            <Sparkles className={cn("w-4 h-4", analyzingId === contact.id && "animate-pulse")} />
                          </Button>

                          <Link to={`/dashboard/contacts/${contact.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover z-50">
                              <DropdownMenuItem>
                                <Reply className="w-4 h-4 mr-2" />
                                Enviar mensagem
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Target className="w-4 h-4 mr-2" />
                                Criar oportunidade
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings2 className="w-4 h-4 mr-2" />
                                Ativar automação
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Archive className="w-4 h-4 mr-2" />
                                Arquivar
                              </DropdownMenuItem>
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

        {/* Pagination - Nexus Style */}
        {totalContacts > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mostrar</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[70px] h-8 rounded-lg border-border/50 bg-background/50">
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
              <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-lg bg-muted/50">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="text-xs font-medium">
                  {totalContacts} contacto{totalContacts !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Página <span className="text-foreground">{currentPage}</span> de <span className="text-foreground">{totalPages || 1}</span>
              </span>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <ChevronLeft className="h-4 w-4 -ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
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
