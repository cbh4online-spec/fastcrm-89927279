import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSmartContacts, useAnalyzeContact, useBulkAnalyzeContacts, SmartContactsFilters, SmartContact } from "@/hooks/useSmartContacts";
import { SmartListsPanel } from "@/components/objects/SmartListsPanel";
import { useBulkAnalyzeEntityLinkedIn } from "@/hooks/useEntitySocialMediaAnalysis";
import { useContacts } from "@/hooks/useContacts";
import { CreateContactDialog } from "./CreateContactDialog";
import { UnifiedDuplicateDialog } from "@/components/crm/UnifiedDuplicateDialog";
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
import { Plus, Users, Download, RefreshCw, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft, Flame, Thermometer, Snowflake, Activity, Clock, UserCheck, UserX, Linkedin, Sparkles, ExternalLink, MoreHorizontal, Reply, Target, Settings2, Archive, Building2, Briefcase, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
// Design System imports
import { EmptyState, SearchEmptyState, TableSkeleton } from "@/components/design-system";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function SmartContactsTable() {
  const { t } = useTranslation("crm");

  // Column configurations for contacts table - ALL form fields
  const CONTACT_COLUMNS: ColumnConfig[] = useMemo(() => [
    // Basic Information
    { id: "name", label: t("col_contact"), category: "basic", defaultVisible: true },
    { id: "client_number", label: t("col_clientNumber"), category: "basic", defaultVisible: true },
    { id: "email", label: t("col_email"), category: "basic", defaultVisible: false },
    { id: "phone", label: t("col_phone"), category: "basic", defaultVisible: false },
    { id: "whatsapp_number", label: t("col_whatsapp"), category: "basic", defaultVisible: false },
    { id: "has_whatsapp", label: t("col_hasWhatsapp"), category: "basic", defaultVisible: false },
    { id: "company", label: t("col_company"), category: "basic", defaultVisible: true },
    { id: "job_title", label: t("col_jobTitle"), category: "basic", defaultVisible: false },
    { id: "commercial_name", label: t("col_commercialName"), category: "basic", defaultVisible: false },
    { id: "source", label: t("col_source"), category: "basic", defaultVisible: true },
    { id: "lead_source", label: t("col_leadSource"), category: "basic", defaultVisible: false },
    { id: "tags", label: t("col_tags"), category: "basic", defaultVisible: false },
    { id: "notes", label: t("col_notes"), category: "basic", defaultVisible: false },
    { id: "is_primary_contact", label: t("col_primaryContact"), category: "basic", defaultVisible: false },
    
    // Location
    { id: "address", label: t("col_address"), category: "basic", defaultVisible: false },
    { id: "city", label: t("col_city"), category: "basic", defaultVisible: false },
    { id: "postal_code", label: t("col_postalCode"), category: "basic", defaultVisible: false },
    { id: "country", label: t("country"), category: "basic", defaultVisible: false },
    { id: "is_fiscal_address", label: t("col_fiscalAddress"), category: "basic", defaultVisible: false },
    
    // AI & Analysis
    { id: "temperature", label: t("col_temperature"), category: "ai", defaultVisible: true, description: t("col_temperatureDesc") },
    { id: "score", label: t("col_score"), category: "ai", defaultVisible: true, description: t("col_scoreDesc") },
    { id: "type", label: t("col_type"), category: "ai", defaultVisible: true, description: t("col_typeDesc") },
    { id: "next_action", label: t("col_nextAction"), category: "ai", defaultVisible: true },
    { id: "insight", label: t("col_insight"), category: "ai", defaultVisible: false },
    { id: "ai_analyzed_at", label: t("col_lastAnalysis"), category: "ai", defaultVisible: false },
    
    // Business
    { id: "sla", label: t("col_sla"), category: "business", defaultVisible: true, description: t("col_slaDesc") },
    { id: "estimated_value", label: t("col_estimatedValue"), category: "business", defaultVisible: false },
    { id: "conversion_prob", label: t("col_conversionProb"), category: "business", defaultVisible: false },
    { id: "automation", label: t("col_automation"), category: "business", defaultVisible: false },
    { id: "assigned_to", label: t("col_assignedTo"), category: "business", defaultVisible: false },
    { id: "last_contact_at", label: t("col_lastContact"), category: "business", defaultVisible: false },
    { id: "last_purchase_date", label: t("col_lastPurchase"), category: "business", defaultVisible: false },
    { id: "activity_start_date", label: t("col_activityStart"), category: "business", defaultVisible: false },
    { id: "client_since", label: t("col_clientSince"), category: "business", defaultVisible: false },
    
    // Client Classification
    { id: "abc_category", label: t("col_abcCategory"), category: "business", defaultVisible: false },
    { id: "client_status", label: t("col_clientStatus"), category: "business", defaultVisible: false },
    { id: "client_types", label: t("col_clientTypes"), category: "business", defaultVisible: false },
    { id: "entity_type", label: t("col_entityType"), category: "business", defaultVisible: false },
    { id: "lead_status", label: t("col_leadStatus"), category: "business", defaultVisible: true },
    { id: "icp_fit_score", label: t("col_icpFit"), category: "ai", defaultVisible: false, description: t("col_icpFitDesc") },
    { id: "engagement_score", label: t("col_engagement"), category: "ai", defaultVisible: false, description: t("col_engagementDesc") },
    { id: "pare_score", label: t("col_pare"), category: "ai", defaultVisible: false, description: t("col_pareDesc") },
    { id: "next_followup_at", label: t("col_nextFollowup"), category: "business", defaultVisible: false },
    { id: "marketing_opt_in", label: t("col_marketingOptIn"), category: "business", defaultVisible: false },
    
    // Fiscal
    { id: "tax_id", label: t("col_taxId"), category: "business", defaultVisible: false },
    { id: "fiscal_regime", label: t("col_fiscalRegime"), category: "business", defaultVisible: false },
    { id: "business_area", label: t("col_businessArea"), category: "business", defaultVisible: false },
    { id: "cae_code", label: t("col_caeCode"), category: "business", defaultVisible: false },
    { id: "cae_description", label: t("col_caeDescription"), category: "business", defaultVisible: false },
    
    // Financial
    { id: "credit_active", label: t("col_creditActive"), category: "business", defaultVisible: false },
    { id: "credit_limit", label: t("col_creditLimit"), category: "business", defaultVisible: false },
    { id: "payment_conditions", label: t("col_paymentConditions"), category: "business", defaultVisible: false },
    { id: "preferred_payment_method", label: t("col_paymentMethod"), category: "business", defaultVisible: false },
    { id: "average_ticket", label: t("col_averageTicket"), category: "business", defaultVisible: false },
    { id: "total_revenue", label: t("col_totalRevenue"), category: "business", defaultVisible: false },
    { id: "sales_2023", label: t("col_sales2023"), category: "business", defaultVisible: false },
    { id: "sales_2024", label: t("col_sales2024"), category: "business", defaultVisible: false },
    { id: "sales_2025", label: t("col_sales2025"), category: "business", defaultVisible: false },
    { id: "sales_2026", label: t("col_sales2026"), category: "business", defaultVisible: false },
    
    // Social / Relations
    { id: "linkedin_url", label: t("col_linkedin"), category: "relations", defaultVisible: false },
    { id: "facebook_url", label: t("col_facebook"), category: "relations", defaultVisible: false },
    { id: "instagram_url", label: t("col_instagram"), category: "relations", defaultVisible: false },
    { id: "twitter_url", label: t("col_twitter"), category: "relations", defaultVisible: false },
    
    // Timestamps
    { id: "created_at", label: t("col_createdAt"), category: "basic", defaultVisible: false },
    { id: "updated_at", label: t("col_updatedAt"), category: "basic", defaultVisible: false },
  ], [t]);

  // Todos os campos editáveis em massa para contactos
  const contactBulkEditFields: BulkEditField[] = useMemo(() => [
    // Informação básica
    { key: "name", label: t("fullName"), type: "text" },
    { key: "email", label: t("col_email"), type: "text" },
    { key: "phone", label: t("col_phone"), type: "text" },
    { key: "whatsapp_number", label: t("col_whatsapp"), type: "text" },
    { key: "has_whatsapp", label: t("col_hasWhatsapp"), type: "boolean" },
    { key: "company", label: t("col_company"), type: "text" },
    { key: "job_title", label: t("col_jobTitle"), type: "text" },
    { key: "commercial_name", label: t("col_commercialName"), type: "text" },
    
    // Localização
    { key: "address", label: t("col_address"), type: "text" },
    { key: "city", label: t("col_city"), type: "text" },
    { key: "postal_code", label: t("col_postalCode"), type: "text" },
    { key: "country", label: t("country"), type: "text" },
    
    // Classificação e Status
    { key: "source", label: t("col_source"), type: "select", options: [
      { value: "website", label: t("bulkEditSourceWebsite") },
      { value: "referral", label: t("bulkEditSourceReferral") },
      { value: "linkedin", label: t("bulkEditSourceLinkedIn") },
      { value: "cold_call", label: t("bulkEditSourceColdCall") },
      { value: "event", label: t("bulkEditSourceEvent") },
      { value: "import", label: t("import") },
      { value: "other", label: t("bulkEditSourceOther") },
    ]},
    { key: "lead_source", label: t("col_leadSource"), type: "text" },
    { key: "client_status", label: t("bulkEditClientStatus"), type: "select", options: [
      { value: "prospect", label: t("bulkEditStatusProspect") },
      { value: "lead", label: t("bulkEditStatusLead") },
      { value: "active", label: t("bulkEditStatusActive") },
      { value: "churned", label: t("bulkEditStatusChurned") },
      { value: "inactive", label: t("bulkEditStatusInactive") },
    ]},
    { key: "client_types", label: t("clientTypes"), type: "text" },
    { key: "abc_category", label: t("col_abcCategory"), type: "select", options: [
      { value: "A", label: t("filterCatA") },
      { value: "B", label: t("filterCatB") },
      { value: "C", label: t("filterCatC") },
    ]},
    
    // IA e Análise
    { key: "ai_temperature", label: t("col_temperature"), type: "select", options: [
      { value: "cold", label: t("temperatureCold") },
      { value: "warm", label: t("temperatureWarm") },
      { value: "hot", label: t("temperatureHot") },
    ]},
    { key: "ai_contact_type", label: t("col_type"), type: "select", options: [
      { value: "decision_maker", label: t("bulkEditTypeDecisionMaker") },
      { value: "influencer", label: t("bulkEditTypeInfluencer") },
      { value: "champion", label: t("bulkEditTypeChampion") },
      { value: "blocker", label: t("bulkEditTypeBlocker") },
      { value: "end_user", label: t("bulkEditTypeEndUser") },
      { value: "unknown", label: t("bulkEditTypeUnknown") },
    ]},
    { key: "ai_next_action_type", label: t("col_nextAction"), type: "select", options: [
      { value: "reply_manual", label: t("actionReplyManual") },
      { value: "send_template", label: t("actionSendTemplate") },
      { value: "create_opportunity", label: t("actionCreateOpportunity") },
      { value: "activate_automation", label: t("actionActivateAutomation") },
      { value: "archive", label: t("actionArchive") },
      { value: "follow_up", label: t("actionFollowUp") },
      { value: "schedule_meeting", label: t("actionScheduleMeeting") },
      { value: "nurture", label: t("bulkEditTypeNurture") },
    ]},
    { key: "contact_score", label: t("col_score"), type: "number" },
    { key: "conversion_probability", label: t("col_conversionProb"), type: "number" },
    { key: "estimated_value", label: t("col_estimatedValue"), type: "number" },
    
    // Automação e Atribuição
    { key: "automation_active", label: t("col_automation"), type: "boolean" },
    { key: "assigned_to", label: t("col_assignedTo"), type: "text" },
    { key: "is_primary_contact", label: t("col_primaryContact"), type: "boolean" },
    
    // Dados fiscais
    { key: "tax_id", label: t("col_taxId"), type: "text" },
    { key: "entity_type", label: t("col_entityType"), type: "select", options: [
      { value: "consumidor_final", label: t("entityConsumidorFinal") },
      { value: "eni", label: t("entityEni") },
      { value: "empresa", label: t("entityEmpresa") },
    ]},
    { key: "fiscal_regime", label: t("col_fiscalRegime"), type: "text" },
    { key: "is_fiscal_address", label: t("col_fiscalAddress"), type: "boolean" },
    
    // Negócio
    { key: "business_area", label: t("col_businessArea"), type: "text" },
    { key: "cae_code", label: t("col_caeCode"), type: "text" },
    { key: "cae_description", label: t("col_caeDescription"), type: "text" },
    
    // Financeiro
    { key: "credit_active", label: t("col_creditActive"), type: "boolean" },
    { key: "credit_limit", label: t("col_creditLimit"), type: "number" },
    { key: "payment_conditions", label: t("col_paymentConditions"), type: "text" },
    { key: "preferred_payment_method", label: t("col_paymentMethod"), type: "select", options: [
      { value: "transfer", label: t("bulkEditPayTransfer") },
      { value: "card", label: t("bulkEditPayCard") },
      { value: "mbway", label: "MB Way" },
      { value: "check", label: t("bulkEditPayCheck") },
      { value: "cash", label: t("bulkEditPayCash") },
    ]},
    { key: "average_ticket", label: t("col_averageTicket"), type: "number" },
    { key: "total_revenue", label: t("col_totalRevenue"), type: "number" },
    
    // Histórico de vendas
    { key: "sales_2023", label: t("col_sales2023"), type: "number" },
    { key: "sales_2024", label: t("col_sales2024"), type: "number" },
    { key: "sales_2025", label: t("col_sales2025"), type: "number" },
    { key: "sales_2026", label: t("col_sales2026"), type: "number" },
    
    // Redes sociais
    { key: "linkedin_url", label: t("col_linkedin"), type: "text" },
    { key: "facebook_url", label: t("col_facebook"), type: "text" },
    { key: "instagram_url", label: t("col_instagram"), type: "text" },
    { key: "twitter_url", label: t("col_twitter"), type: "text" },
    
    // Notas
    { key: "notes", label: t("col_notes"), type: "text" },
  ], [t]);

  // Filter groups for sidebar
  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "temperature",
      label: t("filterTemperature"),
      icon: <Thermometer className="h-4 w-4" />,
      defaultOpen: true,
      items: [
        { id: "temp_hot", label: t("filterHot"), icon: <Flame className="h-4 w-4 text-red-500" /> },
        { id: "temp_warm", label: t("filterWarm"), icon: <Thermometer className="h-4 w-4 text-orange-500" /> },
        { id: "temp_cold", label: t("filterCold"), icon: <Snowflake className="h-4 w-4 text-blue-500" /> },
      ],
    },
    {
      id: "status",
      label: t("filterStatus"),
      icon: <UserCheck className="h-4 w-4" />,
      defaultOpen: true,
      items: [
        { id: "status_active", label: t("filterActiveClients") },
        { id: "status_prospect", label: t("filterProspects") },
        { id: "status_lead", label: t("filterLeads") },
        { id: "status_inactive", label: t("filterInactive") },
        { id: "status_churned", label: t("filterChurned") },
      ],
    },
    {
      id: "activity",
      label: t("filterActivity"),
      icon: <Activity className="h-4 w-4" />,
      items: [
        { id: "activity_recent", label: t("filterRecentContact"), icon: <Clock className="h-4 w-4" /> },
        { id: "activity_no_contact", label: t("filterNoContact30d"), icon: <UserX className="h-4 w-4" /> },
        { id: "activity_never", label: t("filterNeverContacted") },
      ],
    },
    {
      id: "category",
      label: t("filterCategoryABC"),
      icon: <Users className="h-4 w-4" />,
      items: [
        { id: "cat_a", label: t("filterCatA") },
        { id: "cat_b", label: t("filterCatB") },
        { id: "cat_c", label: t("filterCatC") },
      ],
    },
  ], [t]);

  // Page tabs
  const pageTabs = useMemo(() => [
    { id: "contacts", label: t("tabContacts") },
    { id: "smart-lists", label: t("tabSmartLists") },
    { id: "bulk-actions", label: t("tabBulkActions") },
    { id: "import", label: t("tabImport") },
  ], [t]);

  // Sort options
  const sortOptions = useMemo(() => [
    { value: "name_asc", label: t("sortNameAsc") },
    { value: "name_desc", label: t("sortNameDesc") },
    { value: "company_asc", label: t("sortCompanyAsc") },
    { value: "company_desc", label: t("sortCompanyDesc") },
    { value: "temperature_hot", label: t("sortHotFirst") },
    { value: "temperature_cold", label: t("sortColdFirst") },
    { value: "created_desc", label: t("sortNewest") },
    { value: "created_asc", label: t("sortOldest") },
    { value: "score_desc", label: t("sortHighestScore") },
    { value: "score_asc", label: t("sortLowestScore") },
  ], [t]);

  const [filters, setFilters] = useState<SmartContactsFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("contacts");
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
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
  }, [visibleColumns, columnOrder, CONTACT_COLUMNS]);

  const totalColumns = orderedVisibleColumns.length + 3; // +3 for checkbox, name, actions

  const { data: contacts, isLoading, refetch } = useSmartContacts(filters);
  const { deleteContacts, addTagsToContacts, bulkUpdateContacts } = useContacts();
  const analyze = useAnalyzeContact();
  const bulkAnalyze = useBulkAnalyzeContacts();
  const bulkAnalyzeLinkedIn = useBulkAnalyzeEntityLinkedIn('contact');

  // Apply search filter and sorting locally
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    
    let result = contacts;
    
    // Apply search filter
    if (searchValue) {
      const lower = searchValue.toLowerCase();
      result = result.filter(c => {
        const searchableFields = [
          c.name, c.email, c.phone, c.company, c.job_title,
          (c as any).commercial_name, c.source, (c as any).lead_source,
          (c as any).address, (c as any).city, (c as any).postal_code,
          (c as any).country, (c as any).tax_id, (c as any).notes,
          (c as any).business_area, (c as any).cae_code, (c as any).cae_description,
          (c as any).whatsapp_number, (c as any).linkedin_url, (c as any).facebook_url,
          (c as any).instagram_url, (c as any).twitter_url, c.ai_insight,
          c.ai_next_action, (c as any).client_status, (c as any).client_types,
          (c as any).abc_category, (c as any).fiscal_regime,
          (c as any).payment_conditions, (c as any).preferred_payment_method,
          (c as any).entity_type, (c as any).assigned_to,
        ];
        const tags = (c as any).tags || [];
        return searchableFields.some(field => 
          field?.toString().toLowerCase().includes(lower)
        ) || tags.some((tag: string) => tag?.toLowerCase().includes(lower));
      });
    }
    
    // Apply sorting
    result = [...result].sort((a, b) => {
      switch (sortValue) {
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name_desc":
          return (b.name || "").localeCompare(a.name || "");
        case "company_asc":
          return (a.company || "").localeCompare(b.company || "");
        case "company_desc":
          return (b.company || "").localeCompare(a.company || "");
        case "temperature_hot": {
          const order: Record<string, number> = { hot: 0, warm: 1, cold: 2 };
          return (order[a.ai_temperature || 'cold'] ?? 3) - (order[b.ai_temperature || 'cold'] ?? 3);
        }
        case "temperature_cold": {
          const order: Record<string, number> = { cold: 0, warm: 1, hot: 2 };
          return (order[a.ai_temperature || 'cold'] ?? 3) - (order[b.ai_temperature || 'cold'] ?? 3);
        }
        case "created_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "score_desc":
          return (b.contact_score || 0) - (a.contact_score || 0);
        case "score_asc":
          return (a.contact_score || 0) - (b.contact_score || 0);
        default:
          return 0;
      }
    });
    
    return result;
  }, [contacts, searchValue, sortValue]);

  const totalContacts = filteredContacts.length;
  const totalPages = Math.ceil(totalContacts / pageSize);
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredContacts.slice(startIndex, startIndex + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId === activeFilterId ? undefined : filterId);
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
    try { await analyze.mutateAsync({ contactId: id }); toast.success(t("contactAnalyzed")); }
    catch { toast.error(t("errorAnalyzingContact")); }
    finally { setAnalyzingId(null); }
  };

  const handleBulkAnalyze = async () => {
    toast.loading(t("analyzingCompanies", { count: selectedIds.size }));
    try { const r = await bulkAnalyze.mutateAsync(Array.from(selectedIds)); toast.dismiss(); toast.success(t("contactsUpdated", { count: r.successful })); setSelectedIds(new Set()); }
    catch { toast.dismiss(); toast.error(t("errorAnalyzingContact")); }
  };

  const handleBulkAnalyzeLinkedIn = async () => {
    const selected = contacts?.filter(c => selectedIds.has(c.id)) || [];
    const withLinkedIn = selected.filter(c => (c as any).linkedin_url);
    if (withLinkedIn.length === 0) {
      toast.error(t("noLinkedInUrlContacts"));
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
    toast.success(t("contactsUpdated", { count: selectedIds.size }));
    setSelectedIds(new Set());
    refetch();
  };

  const handleExport = () => {
    const selected = contacts?.filter(c => selectedIds.has(c.id)) || [];
    const csv = [
      [t("fullName"), t("col_email"), t("col_phone"), t("col_company"), t("col_temperature"), t("col_score")].join(","),
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

  const filtersActive = !!activeFilterId || Object.keys(filters).some(k => filters[k as keyof SmartContactsFilters]);

  return (
    <div className="flex flex-col lg:flex-row h-full">
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
      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-background via-background to-muted/20">
        {/* Page Header */}
        <PageHeader
          title={t("contactsTitle")}
          count={totalContacts}
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={[
            {
              label: t("import"),
              icon: <Download className="h-4 w-4" />,
              onClick: () => toast.info(t("importContacts")),
              variant: "outline",
            },
            {
              label: t("newContact"),
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setIsCreateOpen(true),
            },
          ]}
        />

        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          searchPlaceholder={t("searchContacts")}
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsDuplicatesOpen(true)} 
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                {t("duplicates")}
              </Button>
              <ColumnSelector
                columns={CONTACT_COLUMNS}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibleColumnsChange={setVisibleColumns}
                onColumnOrderChange={setColumnOrder}
              />
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                {t("refresh")}
              </Button>
            </div>
          }
          className="mt-4"
        />

        {activeTab === "smart-lists" && (
          <div className="mt-4 flex-1">
            <SmartListsPanel
              entityType="contact"
              fields={[
                { slug: "name", name: t("smartListFieldName"), field_type: "text" },
                { slug: "email", name: t("smartListFieldEmail"), field_type: "email" },
                { slug: "company", name: t("smartListFieldCompany"), field_type: "text" },
                { slug: "source", name: t("smartListFieldSource"), field_type: "select", options: { options: ["website", "referral", "linkedin", "cold_call", "event", "import", "other"] } },
                { slug: "ai_temperature", name: t("smartListFieldTemperature"), field_type: "select", options: { options: ["hot", "warm", "cold"] } },
                { slug: "contact_score", name: t("smartListFieldScore"), field_type: "number" },
                { slug: "client_status", name: t("smartListFieldState"), field_type: "select", options: { options: ["prospect", "lead", "active", "churned", "inactive"] } },
                { slug: "estimated_value", name: t("smartListFieldEstimatedValue"), field_type: "currency" },
                { slug: "created_at", name: t("smartListFieldCreatedAt"), field_type: "date" },
                { slug: "last_contact_at", name: t("smartListFieldLastContact"), field_type: "date" },
              ]}
              records={(filteredContacts || []) as unknown as Record<string, unknown>[]}
            />
          </div>
        )}

        {activeTab === "contacts" && selectedIds.size > 0 && (
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

        {activeTab === "contacts" && (
        <React.Fragment>
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
                <TableHead className={cn("min-w-[180px] whitespace-nowrap", stickyHeaderNameStyles)}>{t("col_contact")}</TableHead>
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
                        title={t("noContactsYet")}
                        description={t("noContactsDesc")}
                        action={{
                          label: t("addContact"),
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
                      <TableCell className={cn("w-[40px]", stickyCheckboxStyles)}>
                        <Checkbox
                          checked={selectedIds.has(contact.id)}
                          onCheckedChange={() => toggleSelect(contact.id)}
                        />
                      </TableCell>

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

                      {orderedVisibleColumns.map(col => (
                        <TableCell key={col.id}>
                          <DynamicTableCell 
                            columnId={col.id} 
                            entity={contact as any} 
                            entityType="contact" 
                          />
                        </TableCell>
                      ))}

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
                                {t("sendMessage")}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Target className="w-4 h-4 mr-2" />
                                {t("createOpportunity")}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings2 className="w-4 h-4 mr-2" />
                                {t("activateAutomation")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Archive className="w-4 h-4 mr-2" />
                                {t("archive")}
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

        {/* Pagination */}
        {totalContacts > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("show")}</span>
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
              <span>{t("perPage")}</span>
              <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-lg bg-muted/50">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="text-xs font-medium">
                  {totalContacts} {t("totalContactsLabel")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {t("pageOf", { current: currentPage, total: totalPages || 1 })}
              </span>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" /><ChevronLeft className="h-4 w-4 -ml-2" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}>
                  <ChevronRight className="h-4 w-4" /><ChevronRight className="h-4 w-4 -ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
        </React.Fragment>
        )}

        <CreateContactDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        <UnifiedDuplicateDialog open={isDuplicatesOpen} onOpenChange={setIsDuplicatesOpen} entityType="contacts" />
      </div>
    </div>
  );
}
