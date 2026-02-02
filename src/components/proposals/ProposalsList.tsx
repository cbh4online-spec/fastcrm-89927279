import { useState, useMemo } from "react";
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
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { useProposals, usePublishProposal, useDeleteProposal, useDuplicateProposal, useQuickStatusChange } from "@/hooks/useProposals";
import { CreateProposalDialog } from "./CreateProposalDialog";
import { ProposalDetailDialog } from "./ProposalDetailDialog";
import { ProposalTemplatesList } from "./ProposalTemplatesList";
import { ProposalTaskDialog } from "./ProposalTaskDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Proposal, ProposalStatus } from "@/types/proposal";

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

  // Filter and search
  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    let result = proposals;

    // Status filter
    if (statusFilter) {
      result = result.filter((p) => p.status === statusFilter);
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
  }, [proposals, searchValue, statusFilter]);

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

  const filtersActive = !!statusFilter || !!activeFilterId;

  const getPublicUrl = (slug: string) => {
    return `${window.location.origin}/p/${slug}`;
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
  };

  const handleOpenTaskDialog = (proposal: Proposal) => {
    setTaskProposal(proposal);
    setTaskDialogOpen(true);
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId);
    if (filterId.startsWith("status_")) {
      setStatusFilter(filterId.replace("status_", ""));
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
          p.opportunity?.lead?.name || "",
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
        return (
          <Card className="p-12 text-center">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-medium mb-2">Análise de Propostas</h3>
            <p className="text-sm text-muted-foreground">
              Em breve: Dashboard de performance e conversão de propostas.
            </p>
          </Card>
        );
      default:
        return renderProposalsContent();
    }
  };

  const renderProposalsContent = () => (
    <>
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

      {/* Table */}
      <Card className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : !paginatedProposals?.length ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">Nenhuma proposta encontrada.</h3>
            <p className="text-sm mb-4">
              Crie a primeira proposta para começar a fechar negócios.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira proposta
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      paginatedProposals.length > 0 &&
                      paginatedProposals.every((p) => selectedIds.includes(p.id))
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Oportunidade</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Visualizações</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProposals.map((proposal) => (
                <TableRow 
                  key={proposal.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setDetailId(proposal.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(proposal.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(proposal.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <button 
                      className="text-left hover:text-primary hover:underline transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailId(proposal.id);
                      }}
                    >
                      {proposal.title}
                    </button>
                  </TableCell>
                  <TableCell>{proposal.opportunity?.title || "-"}</TableCell>
                  <TableCell>{proposal.opportunity?.lead?.name || "-"}</TableCell>
                  <TableCell>
                    {formatCurrency(proposal.price, proposal.currency || "EUR")}
                  </TableCell>
                  <TableCell>
                    {proposal.assigned_to_profile ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={proposal.assigned_to_profile.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {proposal.assigned_to_profile.full_name?.charAt(0) || proposal.assigned_to_profile.email?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate max-w-[100px]" title={proposal.assigned_to_profile.full_name || proposal.assigned_to_profile.email || undefined}>
                          {proposal.assigned_to_profile.full_name || proposal.assigned_to_profile.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        statusColors[proposal.status] as
                          | "default"
                          | "secondary"
                          | "destructive"
                      }
                      className={
                        proposal.status === "accepted"
                          ? "bg-green-500 hover:bg-green-600"
                          : ""
                      }
                    >
                      {statusLabels[proposal.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{proposal.views_count}</TableCell>
                  <TableCell>
                    {format(new Date(proposal.created_at), "dd/MM/yyyy", {
                      locale: pt,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailId(proposal.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        
                        {/* Duplicar */}
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(proposal.id);
                          }}
                          disabled={duplicateProposal.isPending}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        
                        {/* Criar Tarefa */}
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTaskDialog(proposal);
                          }}
                        >
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Criar Tarefa
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {/* Alterar Estado */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            Alterar Estado
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {proposal.status !== "accepted" && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(proposal.id, "accepted");
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                                Marcar como Aceita
                              </DropdownMenuItem>
                            )}
                            {proposal.status !== "rejected" && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(proposal.id, "rejected");
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                Marcar como Rejeitada
                              </DropdownMenuItem>
                            )}
                            {proposal.status !== "draft" && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(proposal.id, "draft");
                                }}
                              >
                                <FileClock className="h-4 w-4 mr-2" />
                                Voltar a Rascunho
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        
                        {proposal.status === "published" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(getPublicUrl(proposal.slug), "_blank")
                              }
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Abrir página
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyLink(proposal.slug)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar link
                            </DropdownMenuItem>
                          </>
                        )}
                        {proposal.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() => handlePublish(proposal.id)}
                          >
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

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
    </div>
  );
}
