import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  Euro,
  Eye,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Calendar,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface EntityProposalsSectionProps {
  entityType: "contact" | "company";
  entityId: string;
  entityName: string;
}

interface ProposalWithOpportunity {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "accepted" | "expired" | "rejected";
  price: number | null;
  currency: string;
  views_count: number;
  created_at: string;
  published_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  opportunity: {
    id: string;
    title: string;
    value: number | null;
  } | null;
}

function useEntityProposals(entityType: "contact" | "company", entityId: string) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["proposals", entityType, entityId],
    queryFn: async () => {
      if (!currentWorkspace || !entityId) return [];

      const filterColumn = entityType === "contact" ? "contact_id" : "company_id";

      const { data, error } = await workspaceClient
        .from("proposals")
        .select(`
          id,
          title,
          slug,
          status,
          price,
          currency,
          views_count,
          created_at,
          published_at,
          expires_at,
          accepted_at,
          opportunity:opportunities(id, title, value)
        `)
        .eq(filterColumn, entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ProposalWithOpportunity[];
    },
    enabled: !!currentWorkspace && !!entityId,
  });
}

function useDeleteProposal() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, entityType, entityId }: { id: string; entityType: string; entityId: string }) => {
      const { error } = await workspaceClient.from("proposals").delete().eq("id", id);
      if (error) throw error;
      return { entityType, entityId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["proposals", data.entityType, data.entityId] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["entity-counts"] });
    },
  });
}

const statusConfig: Record<
  ProposalWithOpportunity["status"],
  { label: string; icon: React.ReactNode; className: string }
> = {
  draft: {
    label: "Rascunho",
    icon: <FileText className="w-3.5 h-3.5" />,
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
  published: {
    label: "Publicada",
    icon: <Send className="w-3.5 h-3.5" />,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  accepted: {
    label: "Aceite",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  expired: {
    label: "Expirada",
    icon: <Clock className="w-3.5 h-3.5" />,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  rejected: {
    label: "Rejeitada",
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

function formatCurrency(value: number | null, currency = "EUR"): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function EntityProposalsSection({ entityType, entityId, entityName }: EntityProposalsSectionProps) {
  const navigate = useNavigate();
  const { data: proposals, isLoading } = useEntityProposals(entityType, entityId);
  const deleteProposal = useDeleteProposal();

  const handleDelete = async (proposal: ProposalWithOpportunity) => {
    try {
      await deleteProposal.mutateAsync({ id: proposal.id, entityType, entityId });
      toast.success("Proposta eliminada");
    } catch {
      toast.error("Erro ao eliminar proposta");
    }
  };

  const handleView = (proposal: ProposalWithOpportunity) => {
    navigate(`/dashboard/proposals/${proposal.id}`);
  };

  const handleViewPublic = (proposal: ProposalWithOpportunity) => {
    window.open(`/p/${proposal.slug}`, "_blank");
  };

  // Calculate summary
  const totalValue = proposals?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;
  const acceptedCount = proposals?.filter((p) => p.status === "accepted").length || 0;
  const acceptedValue = proposals
    ?.filter((p) => p.status === "accepted")
    .reduce((sum, p) => sum + (p.price || 0), 0) || 0;
  const publishedCount = proposals?.filter((p) => p.status === "published").length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{publishedCount}</p>
                <p className="text-xs text-muted-foreground">Publicadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{acceptedCount}</p>
                <p className="text-xs text-muted-foreground">Aceites</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Euro className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(acceptedValue)}
                </p>
                <p className="text-xs text-muted-foreground">Valor Aceite</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Propostas</h3>
          <p className="text-sm text-muted-foreground">
            {proposals?.length || 0} propostas • Valor total: {formatCurrency(totalValue)}
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/proposals")} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Proposta
        </Button>
      </div>

      {/* Proposals List */}
      {!proposals?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <h4 className="font-medium mb-1">Sem propostas</h4>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              {entityType === "contact" 
                ? "Este contacto ainda não tem propostas associadas."
                : "Esta empresa ainda não tem propostas associadas."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {proposals.map((proposal) => {
              const config = statusConfig[proposal.status];
              return (
                <Card
                  key={proposal.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleView(proposal)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{proposal.title}</h4>
                          <Badge
                            variant="outline"
                            className={cn("gap-1 shrink-0", config.className)}
                          >
                            {config.icon}
                            {config.label}
                          </Badge>
                        </div>

                        {proposal.opportunity && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                            <Target className="w-3 h-3" />
                            {proposal.opportunity.title}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {proposal.price !== null && (
                            <span className="flex items-center gap-1">
                              <Euro className="w-3 h-3" />
                              {formatCurrency(proposal.price, proposal.currency)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {proposal.views_count} visualizações
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(proposal.created_at), {
                              addSuffix: true,
                              locale: pt,
                            })}
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(proposal);
                            }}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {proposal.status === "published" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPublic(proposal);
                              }}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver Página Pública
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar Proposta</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem a certeza que deseja eliminar "{proposal.title}"? Esta ação não pode ser revertida.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(proposal)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
