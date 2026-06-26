import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProposalWonProcurementModal } from "@/components/procurement/ProposalWonProcurementModal";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreHorizontal,
  Eye,
  ExternalLink,
  Trash2,
  FileText,
  Send,
  Copy,
  Loader2,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  FileClock,
  FileX,
  CircleDollarSign,
  Calendar,
  TrendingUp,
  UserCheck,
  CheckSquare,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  BarChart3,
  Percent,
} from "lucide-react";
import { format, isToday, isThisWeek, isThisMonth } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { useProposals, usePublishProposal, useDeleteProposal, useDuplicateProposal, useQuickStatusChange } from "@/hooks/useProposals";
import { useConvertProposalToOrderNote } from "@/hooks/useConvertProposalToOrderNote";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CreateProposalDialog } from "./CreateProposalDialog";
import { ProposalDetailDialog } from "./ProposalDetailDialog";
import { ProposalTemplatesList } from "./ProposalTemplatesList";
import { ProposalAnalyticsTab } from "./ProposalAnalyticsTab";
import { ProposalTaskDialog } from "./ProposalTaskDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Proposal, ProposalStatus } from "@/types/proposal";
import { DocumentRow, DocumentStatusBadge, type DocumentStatusTone } from "@/components/documents/listing";

const statusTone: Record<ProposalStatus, DocumentStatusTone> = {
  draft: "draft",
  published: "sent",
  accepted: "approved",
  expired: "overdue",
  rejected: "rejected",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const statusLabels: Record<ProposalStatus, string> = {
  draft: "Rascunho",
  published: "Publicada",
  accepted: "Aceita",
  expired: "Expirada",
  rejected: "Rejeitada",
};

const statusColors: Record<ProposalStatus, string> = {
  draft: "secondary",
  published: "default",
  accepted: "default",
  expired: "destructive",
  rejected: "destructive",
};

const pageTabs = [
  { id: "proposals", label: "Propostas" },
  { id: "templates", label: "Modelos" },
  { id: "analytics", label: "Análise" },
];

const sortOptions = [
  { value: "created_desc", label: "Mais recentes" },
  { value: "created_asc", label: "Mais antigas" },
  { value: "value_desc", label: "Maior valor" },
  { value: "value_asc", label: "Menor valor" },
  { value: "views_desc", label: "Mais visualizadas" },
  { value: "title_asc", label: "Título (A-Z)" },
];

const filterGroups: FilterGroup[] = [
  {
    id: "status",
    label: "Estado",
    icon: <FileText className="h-4 w-4" />,
    defaultOpen: true,
    items: [
      { id: "status_draft", label: "Rascunho", icon: <FileClock className="h-4 w-4" /> },
      { id: "status_published", label: "Publicada", icon: <Send className="h-4 w-4" /> },
      { id: "status_accepted", label: "Aceita", icon: <FileCheck className="h-4 w-4 text-green-500" /> },
      { id: "status_expired", label: "Expirada", icon: <FileX className="h-4 w-4 text-orange-500" /> },
      { id: "status_rejected", label: "Rejeitada", icon: <FileX className="h-4 w-4 text-red-500" /> },
    ],
  },
  {
    id: "value",
    label: "Valor",
    icon: <CircleDollarSign className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { id: "value_high", label: "Alto (>10.000€)" },
      { id: "value_medium", label: "Médio (1.000-10.000€)" },
      { id: "value_low", label: "Baixo (<1.000€)" },
    ],
  },
  {
    id: "timing",
    label: "Timing",
    icon: <Calendar className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { id: "timing_today", label: "Criadas hoje" },
      { id: "timing_week", label: "Esta semana" },
      { id: "timing_month", label: "Este mês" },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: <TrendingUp className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { id: "perf_viewed", label: "Visualizadas" },
      { id: "perf_not_viewed", label: "Não visualizadas" },
      { id: "perf_high_views", label: "Muitas visualizações (>10)" },
    ],
  },
];

export function ProposalsList() {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskProposal, setTaskProposal] = useState<Proposal | null>(null);
  const [convertOrderId, setConvertOrderId] = useState<string | null>(null);
  const [procurementModalProposal, setProcurementModalProposal] = useState<{ id: string; title: string } | null>(null);

  // New state for reorganized UI
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("proposals");
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("created_desc");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data: proposals, isLoading, refetch } = useProposals();
  const publishProposal = usePublishProposal();
  const deleteProposal = useDeleteProposal();
  const duplicateProposal = useDuplicateProposal();
  const quickStatusChange = useQuickStatusChange();
  const convertToOrderNote = useConvertProposalToOrderNote();
  const { currentWorkspace } = useWorkspace();

  // Query proposals that already have an order note
  const { data: convertedProposalIds } = useQuery({
    queryKey: ["converted-proposal-ids", currentWorkspace?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("order_notes")
        .select("proposal_id")
        .eq("workspace_id", currentWorkspace!.id)
        .not("proposal_id", "is", null);
      return new Set((data || []).map((d: any) => d.proposal_id as string));
    },
    enabled: !!currentWorkspace?.id,
  });

  // Additional filter state
  const [valueFilter, setValueFilter] = useState<string | undefined>();
  const [timingFilter, setTimingFilter] = useState<string | undefined>();
  const [perfFilter, setPerfFilter] = useState<string | undefined>();

  // Filter and search
  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    let result = proposals;

    // Status filter
    if (statusFilter) {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Value filter
    if (valueFilter) {
      result = result.filter((p) => {
        const price = p.price || 0;
        if (valueFilter === "high") return price > 10000;
        if (valueFilter === "medium") return price >= 1000 && price <= 10000;
        if (valueFilter === "low") return price < 1000;
        return true;
      });
    }

    // Timing filter
    if (timingFilter) {
      result = result.filter((p) => {
        const date = new Date(p.created_at);
        if (timingFilter === "today") return isToday(date);
        if (timingFilter === "week") return isThisWeek(date);
        if (timingFilter === "month") return isThisMonth(date);
        return true;
      });
    }

    // Performance filter
    if (perfFilter) {
      result = result.filter((p) => {
        if (perfFilter === "viewed") return p.views_count > 0;
        if (perfFilter === "not_viewed") return p.views_count === 0;
        if (perfFilter === "high_views") return p.views_count > 10;
        return true;
      });
    }

    // Search filter
    if (searchValue) {
      const lower = searchValue.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(lower) ||
          p.opportunity?.title?.toLowerCase().includes(lower) ||
          p.opportunity?.lead?.name?.toLowerCase().includes(lower)
      );
    }

    return result;
  }, [proposals, searchValue, statusFilter, valueFilter, timingFilter, perfFilter]);

  // Pagination
  const totalProposals = filteredProposals.length;
  const totalPages = Math.ceil(totalProposals / pageSize);
  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProposals.slice(start, start + pageSize);
  }, [filteredProposals, currentPage, pageSize]);

  // Calculate total value
  const totalValue = useMemo(() => {
    return filteredProposals.reduce((sum, p) => sum + (p.price || 0), 0);
  }, [filteredProposals]);

  const filtersActive = !!statusFilter || !!activeFilterId || !!valueFilter || !!timingFilter || !!perfFilter;

  const getPublicUrl = (slug: string) => {
    return `${getPublicBaseUrl()}/p/${slug}`;
  };

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(getPublicUrl(slug));
    toast.success("Link copiado!");
  };

  const handlePublish = async (id: string) => {
    await publishProposal.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteProposal.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleDuplicate = async (proposalId: string) => {
    const newProposal = await duplicateProposal.mutateAsync(proposalId);
    if (newProposal) {
      setDetailId(newProposal.id);
    }
  };

  const handleStatusChange = async (proposalId: string, status: ProposalStatus) => {
    await quickStatusChange.mutateAsync({ id: proposalId, status });
    if (status === "accepted") {
      const prop = proposals?.find(p => p.id === proposalId);
      if (prop) {
        setProcurementModalProposal({ id: proposalId, title: prop.title });
      }
    }
  };

  const handleOpenTaskDialog = (proposal: Proposal) => {
    setTaskProposal(proposal);
    setTaskDialogOpen(true);
  };

  const handleConvertToOrderNote = async () => {
    if (!convertOrderId) return;
    try {
      const result = await convertToOrderNote.mutateAsync({ proposalId: convertOrderId });
      setConvertOrderId(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId);
    if (filterId.startsWith("status_")) {
      setStatusFilter(filterId.replace("status_", ""));
      setValueFilter(undefined);
      setTimingFilter(undefined);
      setPerfFilter(undefined);
    } else if (filterId.startsWith("value_")) {
      setValueFilter(filterId.replace("value_", ""));
      setStatusFilter(undefined);
      setTimingFilter(undefined);
      setPerfFilter(undefined);
    } else if (filterId.startsWith("timing_")) {
      setTimingFilter(filterId.replace("timing_", ""));
      setStatusFilter(undefined);
      setValueFilter(undefined);
      setPerfFilter(undefined);
    } else if (filterId.startsWith("perf_")) {
      setPerfFilter(filterId.replace("perf_", ""));
      setStatusFilter(undefined);
      setValueFilter(undefined);
      setTimingFilter(undefined);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedProposals.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkExport = () => {
    const selected = proposals?.filter((p) => selectedIds.includes(p.id)) || [];
    if (selected.length === 0) return;
    const csv = [
      ["Título", "Oportunidade", "Cliente", "Valor", "Estado", "Visualizações", "Criada em"].join(","),
      ...selected.map((p) =>
        [
          p.title,
          p.opportunity?.title || "",
          p.contact?.name || p.company?.name || p.opportunity?.lead?.name || "",
          p.price || 0,
          statusLabels[p.status],
          p.views_count,
          format(new Date(p.created_at), "dd/MM/yyyy"),
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `propostas_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success(`${selected.length} propostas exportadas`);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length > 0) {
      setDeleteId(selectedIds[0]); // For now, delete one at a time
    }
  };

  const formatCurrency = (value: number | null, currency?: string) => {
    if (!value) return "-";
    // Default to EUR if no currency specified
    const currencyCode = currency || "EUR";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currencyCode,
    }).format(value);
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "templates":
        return <ProposalTemplatesList />;
      case "analytics":
        return <ProposalAnalyticsTab />;
      default:
        return renderProposalsContent();
    }
  };

  const renderProposalsContent = () => {
    const acceptedCount = (proposals || []).filter(p => p.status === "accepted").length;
    const allTotal = (proposals || []).length;
    const conversionRate = allTotal > 0 ? Math.round((acceptedCount / allTotal) * 100) : 0;
    const avgValue = allTotal > 0 ? Math.round(totalValue / allTotal) : 0;

    return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <Card
          className="p-3 cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => { setActiveFilterId(undefined); setStatusFilter(undefined); setValueFilter(undefined); setTimingFilter(undefined); setPerfFilter(undefined); }}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="text-xl font-bold">{totalProposals}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Valor Total</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
        </Card>
        <Card
          className="p-3 cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => { setActiveFilterId("status_accepted"); setStatusFilter("accepted"); setValueFilter(undefined); setTimingFilter(undefined); setPerfFilter(undefined); }}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Aceitas</span>
          </div>
          <p className="text-xl font-bold">{acceptedCount}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Conversão</span>
          </div>
          <p className="text-xl font-bold">{conversionRate}%</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Valor Médio</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(avgValue)}</p>
        </Card>
      </div>

      {/* Toolbar */}
      <Toolbar
        searchValue={searchValue}
        searchPlaceholder="Pesquisar propostas..."
        onSearchChange={setSearchValue}
        showFilters={true}
        filtersActive={filtersActive}
        onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
        onClearFilters={() => {
          setActiveFilterId(undefined);
          setStatusFilter(undefined);
          setValueFilter(undefined);
          setTimingFilter(undefined);
          setPerfFilter(undefined);
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
            {showFilterSidebar ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
        }
        rightActions={
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      />

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 py-2 px-4 bg-muted/50 rounded-lg mb-4">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} {selectedIds.length === 1 ? "selecionada" : "selecionadas"}
          </span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleBulkExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDelete}
            className="gap-2 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      )}

      {/* Lista de propostas (estilo InvoiceXpress) */}
      {isLoading ? (
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </Card>
      ) : !paginatedProposals?.length ? (
        <Card className="p-12 text-center text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">Nenhuma proposta encontrada.</h3>
          <p className="text-sm mb-4">
            Crie a primeira proposta para começar a fechar negócios.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar primeira proposta
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {paginatedProposals.map((proposal) => {
            const clientName =
              proposal.contact?.name ||
              proposal.company?.name ||
              proposal.opportunity?.lead?.name ||
              "—";
            return (
              <DocumentRow
                key={proposal.id}
                selected={selectedIds.includes(proposal.id)}
                onSelectedChange={(c) => handleSelectOne(proposal.id, c)}
                statusBadge={
                  <DocumentStatusBadge
                    label={statusLabels[proposal.status]}
                    tone={statusTone[proposal.status]}
                  />
                }
                number={proposal.title}
                subtitle={proposal.opportunity?.title ? `OPORTUNIDADE · ${proposal.opportunity.title}` : "PROPOSTA"}
                clientName={clientName}
                clientSubtitle={
                  proposal.assigned_to_profile?.full_name ||
                  proposal.assigned_to_profile?.email ||
                  undefined
                }
                issueDate={format(new Date(proposal.created_at), "dd/MM/yyyy", { locale: pt })}
                dueDate={`${proposal.views_count} visualizações`}
                totalPrimary={formatCurrency(proposal.price, proposal.currency || "EUR")}
                totalSecondary={proposal.currency && proposal.currency !== "EUR" ? proposal.currency : undefined}
                onClick={() => setDetailId(proposal.id)}
                action={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => setDetailId(proposal.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(proposal.id); }}
                        disabled={duplicateProposal.isPending}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleOpenTaskDialog(proposal); }}
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Criar Tarefa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                          Alterar Estado
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {proposal.status !== "accepted" && (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(proposal.id, "accepted"); }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                              Marcar como Aceita
                            </DropdownMenuItem>
                          )}
                          {proposal.status !== "rejected" && (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(proposal.id, "rejected"); }}
                            >
                              <XCircle className="h-4 w-4 mr-2 text-red-500" />
                              Marcar como Rejeitada
                            </DropdownMenuItem>
                          )}
                          {proposal.status !== "draft" && (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(proposal.id, "draft"); }}
                            >
                              <FileClock className="h-4 w-4 mr-2" />
                              Voltar a Rascunho
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      {proposal.status === "accepted" && (proposal.contact_id || proposal.company_id) && (
                        convertedProposalIds?.has(proposal.id) ? (
                          <DropdownMenuItem disabled>
                            <ShoppingCart className="h-4 w-4 mr-2 text-muted-foreground" />
                            Já convertida em Encomenda
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setConvertOrderId(proposal.id); }}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Converter em Encomenda
                          </DropdownMenuItem>
                        )
                      )}
                      {proposal.status === "published" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => window.open(getPublicUrl(proposal.slug), "_blank")}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Abrir página
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyLink(proposal.slug)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar link
                          </DropdownMenuItem>
                        </>
                      )}
                      {proposal.status === "draft" && (
                        <DropdownMenuItem onClick={() => handlePublish(proposal.id)}>
                          <Send className="h-4 w-4 mr-2" />
                          Publicar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(proposal.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">por página</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
    );
  };

  return (
    <div className="flex h-full -m-6">
      {/* Filter Sidebar - only show for proposals tab */}
      {activeTab === "proposals" && (
        <FilterSidebar
          filterGroups={filterGroups}
          activeFilterId={activeFilterId}
          onFilterSelect={handleFilterSelect}
          onClearFilter={() => {
            setActiveFilterId(undefined);
            setStatusFilter(undefined);
            setValueFilter(undefined);
            setTimingFilter(undefined);
            setPerfFilter(undefined);
          }}
          isOpen={showFilterSidebar}
          onClose={() => setShowFilterSidebar(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 p-6">
        {/* Page Header */}
        <PageHeader
          title="Propostas"
          count={activeTab === "proposals" ? totalProposals : undefined}
          description={activeTab === "proposals" ? `Valor total: ${formatCurrency(totalValue)}` : undefined}
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={activeTab === "proposals" ? [
            {
              label: "Nova Proposta",
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setCreateOpen(true),
            },
          ] : undefined}
        />

        {/* Tab Content */}
        {renderTabContent()}
      </div>

      <CreateProposalDialog open={createOpen} onOpenChange={setCreateOpen} />

      {detailId && (
        <ProposalDetailDialog
          open={!!detailId}
          onOpenChange={(open) => !open && setDetailId(null)}
          proposalId={detailId}
        />
      )}

      <ProposalTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        proposal={taskProposal}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A proposta será permanentemente
              removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Order Note Dialog */}
      <AlertDialog open={!!convertOrderId} onOpenChange={(open) => !open && setConvertOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Converter em Nota de Encomenda?</AlertDialogTitle>
            <AlertDialogDescription>
              Os itens desta proposta serão usados para criar uma nova Nota de Encomenda
              com estado &quot;Submetida&quot;. Se necessário, será criado automaticamente
              um utilizador cliente associado ao contacto/empresa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={convertToOrderNote.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvertToOrderNote}
              disabled={convertToOrderNote.isPending}
            >
              {convertToOrderNote.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Converter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {procurementModalProposal && (
        <ProposalWonProcurementModal
          open={!!procurementModalProposal}
          onOpenChange={(open) => { if (!open) setProcurementModalProposal(null); }}
          proposalId={procurementModalProposal.id}
          proposalTitle={procurementModalProposal.title}
          workspaceId={proposals?.[0]?.workspace_id || ""}
        />
      )}
    </div>
  );
}
