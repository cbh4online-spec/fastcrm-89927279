import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProposalWonProcurementModal } from "@/components/procurement/ProposalWonProcurementModal";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IXEntityTabs } from "@/components/entity/ix/IXEntityTabs";
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
  Download,
  CheckSquare,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  FileClock,
} from "lucide-react";
import { format, isToday, isThisWeek, isThisMonth } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import {
  useProposals,
  usePublishProposal,
  useDeleteProposal,
  useDuplicateProposal,
  useQuickStatusChange,
} from "@/hooks/useProposals";
import { useConvertProposalToOrderNote } from "@/hooks/useConvertProposalToOrderNote";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CreateProposalDialog } from "./CreateProposalDialog";
import { ProposalDetailDialog } from "./ProposalDetailDialog";
import { ProposalTemplatesList } from "./ProposalTemplatesList";
import { ProposalAnalyticsTab } from "./ProposalAnalyticsTab";
import { ProposalTaskDialog } from "./ProposalTaskDialog";
import type { Proposal, ProposalStatus } from "@/types/proposal";
import {
  DocumentListLayout,
  DocumentFilterChip,
  DocumentListToolbar,
  DocumentSummaryCard,
  DocumentRow,
  DocumentStatusBadge,
  type DocumentStatusTone,
  type SummaryItem,
} from "@/components/documents/listing";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const statusTone: Record<ProposalStatus, DocumentStatusTone> = {
  draft: "draft",
  published: "sent",
  accepted: "approved",
  expired: "overdue",
  rejected: "rejected",
};

const statusLabels: Record<ProposalStatus, string> = {
  draft: "Rascunho",
  published: "Publicada",
  accepted: "Aceita",
  expired: "Expirada",
  rejected: "Rejeitada",
};

// Normaliza nomes de moeda comuns (Euro, EURO, €) para códigos ISO 4217.
const CURRENCY_ALIASES: Record<string, string> = {
  euro: "EUR",
  euros: "EUR",
  "€": "EUR",
  dolar: "USD",
  dollar: "USD",
  $: "USD",
  libra: "GBP",
  "£": "GBP",
};

function normalizeCurrencyCode(currency?: string | null): string {
  if (!currency) return "EUR";
  const trimmed = currency.trim();
  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();
  const key = trimmed.toLowerCase();
  return CURRENCY_ALIASES[key] ?? "EUR";
}

function formatCurrency(value: number | null | undefined, currency?: string | null) {
  if (value === null || value === undefined) return "—";
  try {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: normalizeCurrencyCode(currency),
    }).format(value);
  } catch {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  }
}

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

type ValueBucket = "high" | "medium" | "low";
type TimingBucket = "today" | "week" | "month";
type PerfBucket = "viewed" | "not_viewed" | "high_views";

export function ProposalsList() {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskProposal, setTaskProposal] = useState<Proposal | null>(null);
  const [convertOrderId, setConvertOrderId] = useState<string | null>(null);
  const [procurementModalProposal, setProcurementModalProposal] =
    useState<{ id: string; title: string } | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("proposals");
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("created_desc");
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "all">("all");
  const [valueFilter, setValueFilter] = useState<ValueBucket | "all">("all");
  const [timingFilter, setTimingFilter] = useState<TimingBucket | "all">("all");
  const [perfFilter, setPerfFilter] = useState<PerfBucket | "all">("all");

  const { data: proposals, isLoading } = useProposals();
  const publishProposal = usePublishProposal();
  const deleteProposal = useDeleteProposal();
  const duplicateProposal = useDuplicateProposal();
  const quickStatusChange = useQuickStatusChange();
  const convertToOrderNote = useConvertProposalToOrderNote();
  const { currentWorkspace } = useWorkspace();

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

  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    let result = [...proposals];

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (valueFilter !== "all") {
      result = result.filter((p) => {
        const price = p.price || 0;
        if (valueFilter === "high") return price > 10000;
        if (valueFilter === "medium") return price >= 1000 && price <= 10000;
        return price < 1000;
      });
    }
    if (timingFilter !== "all") {
      result = result.filter((p) => {
        const date = new Date(p.created_at);
        if (timingFilter === "today") return isToday(date);
        if (timingFilter === "week") return isThisWeek(date);
        return isThisMonth(date);
      });
    }
    if (perfFilter !== "all") {
      result = result.filter((p) => {
        if (perfFilter === "viewed") return p.views_count > 0;
        if (perfFilter === "not_viewed") return p.views_count === 0;
        return p.views_count > 10;
      });
    }
    if (searchValue) {
      const lower = searchValue.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(lower) ||
          p.opportunity?.title?.toLowerCase().includes(lower) ||
          p.opportunity?.lead?.name?.toLowerCase().includes(lower),
      );
    }

    result.sort((a, b) => {
      switch (sortValue) {
        case "created_asc":
          return a.created_at.localeCompare(b.created_at);
        case "value_desc":
          return (b.price || 0) - (a.price || 0);
        case "value_asc":
          return (a.price || 0) - (b.price || 0);
        case "views_desc":
          return (b.views_count || 0) - (a.views_count || 0);
        case "title_asc":
          return a.title.localeCompare(b.title);
        case "created_desc":
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
    return result;
  }, [proposals, searchValue, statusFilter, valueFilter, timingFilter, perfFilter, sortValue]);

  const totalProposals = filteredProposals.length;
  const totalPages = Math.max(1, Math.ceil(totalProposals / pageSize));
  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProposals.slice(start, start + pageSize);
  }, [filteredProposals, currentPage, pageSize]);

  const summary = useMemo(() => {
    const list = proposals || [];
    let draftValue = 0;
    let publishedValue = 0;
    let acceptedValue = 0;
    let rejectedValue = 0;
    let totalValue = 0;
    list.forEach((p) => {
      const v = p.price || 0;
      totalValue += v;
      switch (p.status) {
        case "draft":
          draftValue += v;
          break;
        case "published":
          publishedValue += v;
          break;
        case "accepted":
          acceptedValue += v;
          break;
        case "rejected":
        case "expired":
          rejectedValue += v;
          break;
      }
    });
    return { draftValue, publishedValue, acceptedValue, rejectedValue, totalValue };
  }, [proposals]);

  const summaryItems: SummaryItem[] = [
    { label: "Não Vencido", value: formatCurrency(summary.publishedValue), tone: "default" },
    { label: "Vencido", value: formatCurrency(summary.rejectedValue), tone: summary.rejectedValue > 0 ? "destructive" : "default" },
    { label: "Total sem IVA", value: formatCurrency(summary.totalValue), tone: "primary" },
    { label: "IVA", value: formatCurrency(0), tone: "default" },
    { label: "Total", value: formatCurrency(summary.totalValue), tone: "primary" },
  ];
  const summarySeparators: Array<"+" | "=" | null> = ["+", "=", "+", "="];

  const filtersActive =
    statusFilter !== "all" ||
    valueFilter !== "all" ||
    timingFilter !== "all" ||
    perfFilter !== "all" ||
    !!searchValue;

  const clearFilters = () => {
    setStatusFilter("all");
    setValueFilter("all");
    setTimingFilter("all");
    setPerfFilter("all");
    setSearchValue("");
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(paginatedProposals.map((p) => p.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  const getPublicUrl = (slug: string) => `${getPublicBaseUrl()}/p/${slug}`;

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
    if (newProposal) setDetailId(newProposal.id);
  };

  const handleStatusChange = async (proposalId: string, status: ProposalStatus) => {
    await quickStatusChange.mutateAsync({ id: proposalId, status });
    if (status === "accepted") {
      const prop = proposals?.find((p) => p.id === proposalId);
      if (prop) setProcurementModalProposal({ id: proposalId, title: prop.title });
    }
  };

  const handleOpenTaskDialog = (proposal: Proposal) => {
    setTaskProposal(proposal);
    setTaskDialogOpen(true);
  };

  const handleConvertToOrderNote = async () => {
    if (!convertOrderId) return;
    try {
      await convertToOrderNote.mutateAsync({ proposalId: convertOrderId });
      setConvertOrderId(null);
    } catch {
      // handled by mutation
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
        ].join(","),
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

  const valueBucketLabel: Record<ValueBucket | "all", string> = {
    all: "Todos",
    high: "Alto (>10.000€)",
    medium: "Médio (1.000-10.000€)",
    low: "Baixo (<1.000€)",
  };
  const timingBucketLabel: Record<TimingBucket | "all", string> = {
    all: "Sempre",
    today: "Hoje",
    week: "Esta semana",
    month: "Este mês",
  };
  const perfBucketLabel: Record<PerfBucket | "all", string> = {
    all: "Todas",
    viewed: "Visualizadas",
    not_viewed: "Não visualizadas",
    high_views: ">10 visualizações",
  };

  return (
    <DocumentListLayout
      title="Propostas"
      searchValue={searchValue}
      onSearchChange={(v) => {
        setSearchValue(v);
        setCurrentPage(1);
      }}
      searchPlaceholder="Pesquisar por título, oportunidade ou cliente"
      primaryAction={
        activeTab === "proposals" ? (
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nova Proposta
          </Button>
        ) : undefined
      }
      chips={
        activeTab === "proposals" ? (
          <>
            <DocumentFilterChip
              label="Estado"
              value={statusFilter === "all" ? "Todos" : statusLabels[statusFilter]}
              active={statusFilter !== "all"}
            >
              <DropdownMenuItem onSelect={() => setStatusFilter("all")}>Todos</DropdownMenuItem>
              <DropdownMenuSeparator />
              {(Object.keys(statusLabels) as ProposalStatus[]).map((s) => (
                <DropdownMenuItem key={s} onSelect={() => setStatusFilter(s)}>
                  {statusLabels[s]}
                </DropdownMenuItem>
              ))}
            </DocumentFilterChip>
            <DocumentFilterChip
              label="Valor"
              value={valueBucketLabel[valueFilter]}
              active={valueFilter !== "all"}
            >
              {(Object.keys(valueBucketLabel) as Array<ValueBucket | "all">).map((k) => (
                <DropdownMenuItem key={k} onSelect={() => setValueFilter(k)}>
                  {valueBucketLabel[k]}
                </DropdownMenuItem>
              ))}
            </DocumentFilterChip>
            <DocumentFilterChip
              label="Datas"
              value={timingBucketLabel[timingFilter]}
              active={timingFilter !== "all"}
            >
              {(Object.keys(timingBucketLabel) as Array<TimingBucket | "all">).map((k) => (
                <DropdownMenuItem key={k} onSelect={() => setTimingFilter(k)}>
                  {timingBucketLabel[k]}
                </DropdownMenuItem>
              ))}
            </DocumentFilterChip>
            <DocumentFilterChip
              label="Performance"
              value={perfBucketLabel[perfFilter]}
              active={perfFilter !== "all"}
            >
              {(Object.keys(perfBucketLabel) as Array<PerfBucket | "all">).map((k) => (
                <DropdownMenuItem key={k} onSelect={() => setPerfFilter(k)}>
                  {perfBucketLabel[k]}
                </DropdownMenuItem>
              ))}
            </DocumentFilterChip>
            <DocumentFilterChip label="Ordenação" value={sortOptions.find((o) => o.value === sortValue)?.label || "—"}>
              {sortOptions.map((o) => (
                <DropdownMenuItem key={o.value} onSelect={() => setSortValue(o.value)}>
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DocumentFilterChip>
            <DocumentFilterChip label="Resultados" value={`${pageSize}/página`}>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onSelect={() => {
                    setPageSize(s);
                    setCurrentPage(1);
                  }}
                >
                  {s}
                </DropdownMenuItem>
              ))}
            </DocumentFilterChip>
          </>
        ) : undefined
      }
      summary={
        activeTab === "proposals" ? (
          <DocumentSummaryCard
            items={summaryItems}
            separators={summarySeparators}
            footer={
              <>
                <span className="text-amber-700">
                  <strong>Rascunho:</strong> {formatCurrency(summary.draftValue)}
                </span>
                <span className="text-muted-foreground/40">|</span>
                <span className="text-emerald-700">
                  <strong>Aceite:</strong> {formatCurrency(summary.acceptedValue)}
                </span>
                <span className="text-muted-foreground/40">|</span>
                <span className="text-destructive">
                  <strong>Recusado:</strong> {formatCurrency(summary.rejectedValue)}
                </span>
              </>
            }
          />
        ) : undefined
      }
      toolbar={
        activeTab === "proposals" ? (
          <DocumentListToolbar
            selectAllChecked={
              paginatedProposals.length > 0 &&
              paginatedProposals.every((p) => selectedIds.includes(p.id))
            }
            onSelectAll={handleSelectAll}
            sortOptions={sortOptions}
            sortValue={sortValue}
            onSortChange={setSortValue}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(v) => {
              setPageSize(v);
              setCurrentPage(1);
            }}
            totalCount={totalProposals}
            countLabel="Documentos"
            onClearFilters={clearFilters}
            clearFiltersDisabled={!filtersActive}
          />
        ) : undefined
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-2 bg-transparent p-0 gap-1">
          {pageTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {activeTab === "templates" ? (
        <ProposalTemplatesList />
      ) : activeTab === "analytics" ? (
        <ProposalAnalyticsTab />
      ) : (
        <>
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2">
              <span className="text-sm text-foreground">
                {selectedIds.length} {selectedIds.length === 1 ? "selecionada" : "selecionadas"}
              </span>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={handleBulkExport} className="gap-2">
                <Download className="h-4 w-4" /> Exportar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedIds[0] && setDeleteId(selectedIds[0])}
                className="gap-2 text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Eliminar
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : paginatedProposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-base font-medium text-foreground">
                Não encontrámos documentos para a sua pesquisa…
              </h3>
              <Button onClick={() => setCreateOpen(true)} className="gap-2 rounded-full">
                <Plus className="h-4 w-4" /> Criar primeira proposta
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
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
                    subtitle={
                      proposal.opportunity?.title
                        ? `OPORTUNIDADE · ${proposal.opportunity.title}`
                        : "PROPOSTA"
                    }
                    clientName={clientName}
                    clientSubtitle={
                      proposal.assigned_to_profile?.full_name ||
                      proposal.assigned_to_profile?.email ||
                      undefined
                    }
                    issueDate={format(new Date(proposal.created_at), "dd/MM/yyyy", { locale: pt })}
                    dueDate={`${proposal.views_count} visualizações`}
                    totalPrimary={formatCurrency(proposal.price, proposal.currency)}
                    totalSecondary={
                      proposal.currency && normalizeCurrencyCode(proposal.currency) !== "EUR"
                        ? proposal.currency
                        : undefined
                    }
                    onClick={() => setDetailId(proposal.id)}
                    action={
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:bg-primary/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => setDetailId(proposal.id)}>
                            <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(proposal.id);
                            }}
                            disabled={duplicateProposal.isPending}
                          >
                            <Copy className="h-4 w-4 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTaskDialog(proposal);
                            }}
                          >
                            <CheckSquare className="h-4 w-4 mr-2" /> Criar Tarefa
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <ArrowRightLeft className="h-4 w-4 mr-2" /> Alterar Estado
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
                                  <FileClock className="h-4 w-4 mr-2" /> Voltar a Rascunho
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          {proposal.status === "accepted" &&
                            (proposal.contact_id || proposal.company_id) &&
                            (convertedProposalIds?.has(proposal.id) ? (
                              <DropdownMenuItem disabled>
                                <ShoppingCart className="h-4 w-4 mr-2 text-muted-foreground" />
                                Já convertida em Encomenda
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConvertOrderId(proposal.id);
                                }}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Converter em Encomenda
                              </DropdownMenuItem>
                            ))}
                          {proposal.status === "published" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => window.open(getPublicUrl(proposal.slug), "_blank")}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" /> Abrir página
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyLink(proposal.slug)}>
                                <Copy className="h-4 w-4 mr-2" /> Copiar link
                              </DropdownMenuItem>
                            </>
                          )}
                          {proposal.status === "draft" && (
                            <DropdownMenuItem onClick={() => handlePublish(proposal.id)}>
                              <Send className="h-4 w-4 mr-2" /> Publicar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(proposal.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                  />
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Seguinte
              </Button>
            </div>
          )}
        </>
      )}

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
              Esta ação não pode ser desfeita. A proposta será permanentemente removida.
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

      <AlertDialog open={!!convertOrderId} onOpenChange={(open) => !open && setConvertOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Converter em Nota de Encomenda?</AlertDialogTitle>
            <AlertDialogDescription>
              Os itens desta proposta serão usados para criar uma nova Nota de Encomenda associada
              ao mesmo cliente. Poderá depois editá-la antes de a confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertToOrderNote}>
              Converter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {procurementModalProposal && currentWorkspace?.id && (
        <ProposalWonProcurementModal
          open={!!procurementModalProposal}
          onOpenChange={(open) => !open && setProcurementModalProposal(null)}
          proposalId={procurementModalProposal.id}
          proposalTitle={procurementModalProposal.title}
          workspaceId={currentWorkspace.id}
        />
      )}
    </DocumentListLayout>
  );
}
