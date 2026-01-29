import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Target, 
  Euro,
  Calendar,
  TrendingUp,
  MoreHorizontal,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Opportunity, OpportunityStatus } from "@/hooks/useOpportunities";

interface OpportunitiesSectionProps {
  leadId: string;
  leadName: string;
}

function useLeadOpportunities(leadId: string) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["opportunities", "lead", leadId],
    queryFn: async () => {
      if (!currentWorkspace || !leadId) return [];

      const { data, error } = await workspaceClient
        .from("opportunities")
        .select(`
          *,
          stage:pipeline_stages(id, name, color, position)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (Opportunity & { stage?: { id: string; name: string; color: string; position: number } })[];
    },
    enabled: !!currentWorkspace && !!leadId,
  });
}

function useCreateLeadOpportunity() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      lead_id: string;
      title: string;
      value: number;
      stage_id: string;
      expected_close_date?: string;
      notes?: string;
    }) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      const { data, error } = await workspaceClient
        .from("opportunities")
        .insert({
          workspace_id: currentWorkspace.id,
          owner_id: user.id,
          lead_id: input.lead_id,
          title: input.title,
          value: input.value || 0,
          stage_id: input.stage_id,
          expected_close_date: input.expected_close_date || null,
          notes: input.notes || null,
          status: "open" as OpportunityStatus,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities", "lead", variables.lead_id] });
      queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["entity-counts"] });
    },
  });
}

function useUpdateLeadOpportunity() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      lead_id: string;
      title?: string;
      value?: number;
      stage_id?: string;
      status?: OpportunityStatus;
      expected_close_date?: string | null;
      notes?: string | null;
      lost_reason?: string | null;
    }) => {
      const { id, lead_id, ...updates } = input;

      const { data, error } = await workspaceClient
        .from("opportunities")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, lead_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities", "lead", data.lead_id] });
      queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace?.id] });
    },
  });
}

function useDeleteLeadOpportunity() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, lead_id }: { id: string; lead_id: string }) => {
      const { error } = await workspaceClient.from("opportunities").delete().eq("id", id);
      if (error) throw error;
      return { lead_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities", "lead", data.lead_id] });
      queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["entity-counts"] });
    },
  });
}

const statusConfig: Record<OpportunityStatus, { label: string; icon: React.ReactNode; className: string }> = {
  open: {
    label: "Em Aberto",
    icon: <Clock className="w-3.5 h-3.5" />,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  won: {
    label: "Ganha",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  lost: {
    label: "Perdida",
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function OpportunitiesSection({ leadId, leadName }: OpportunitiesSectionProps) {
  const { data: opportunities, isLoading } = useLeadOpportunities(leadId);
  const { data: stages } = usePipelineStages();
  const createOpportunity = useCreateLeadOpportunity();
  const updateOpportunity = useUpdateLeadOpportunity();
  const deleteOpportunity = useDeleteLeadOpportunity();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setTitle("");
    setValue("");
    setStageId(stages?.[0]?.id || "");
    setExpectedCloseDate("");
    setNotes("");
    setEditingOpp(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setTitle(`Oportunidade - ${leadName}`);
    setStageId(stages?.[0]?.id || "");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (opp: Opportunity) => {
    setEditingOpp(opp);
    setTitle(opp.title);
    setValue(String(opp.value || 0));
    setStageId(opp.stage_id);
    setExpectedCloseDate(opp.expected_close_date?.split("T")[0] || "");
    setNotes(opp.notes || "");
    setIsCreateOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !stageId) {
      toast.error("Preencha o título e seleccione uma fase");
      return;
    }

    try {
      if (editingOpp) {
        await updateOpportunity.mutateAsync({
          id: editingOpp.id,
          lead_id: leadId,
          title: title.trim(),
          value: parseFloat(value) || 0,
          stage_id: stageId,
          expected_close_date: expectedCloseDate || null,
          notes: notes.trim() || null,
        });
        toast.success("Oportunidade actualizada");
      } else {
        await createOpportunity.mutateAsync({
          lead_id: leadId,
          title: title.trim(),
          value: parseFloat(value) || 0,
          stage_id: stageId,
          expected_close_date: expectedCloseDate || undefined,
          notes: notes.trim() || undefined,
        });
        toast.success("Oportunidade criada");
      }
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Erro ao guardar oportunidade");
    }
  };

  const handleStatusChange = async (opp: Opportunity, newStatus: OpportunityStatus) => {
    try {
      await updateOpportunity.mutateAsync({
        id: opp.id,
        lead_id: leadId,
        status: newStatus,
      });
      toast.success(`Oportunidade marcada como ${statusConfig[newStatus].label}`);
    } catch {
      toast.error("Erro ao actualizar status");
    }
  };

  const handleDelete = async (opp: Opportunity) => {
    try {
      await deleteOpportunity.mutateAsync({ id: opp.id, lead_id: leadId });
      toast.success("Oportunidade eliminada");
    } catch {
      toast.error("Erro ao eliminar oportunidade");
    }
  };

  // Calculate summary
  const totalValue = opportunities?.reduce((sum, opp) => sum + Number(opp.value || 0), 0) || 0;
  const openCount = opportunities?.filter((o) => o.status === "open").length || 0;
  const wonCount = opportunities?.filter((o) => o.status === "won").length || 0;
  const wonValue = opportunities?.filter((o) => o.status === "won").reduce((sum, opp) => sum + Number(opp.value || 0), 0) || 0;

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
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{openCount}</p>
                <p className="text-xs text-muted-foreground">Em Aberto</p>
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
                <p className="text-2xl font-bold text-emerald-600">{wonCount}</p>
                <p className="text-xs text-muted-foreground">Ganhas</p>
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
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(wonValue)}</p>
                <p className="text-xs text-muted-foreground">Valor Ganho</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Oportunidades</h3>
          <p className="text-sm text-muted-foreground">
            {opportunities?.length || 0} oportunidades • Valor total: {formatCurrency(totalValue)}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Oportunidade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingOpp ? "Editar Oportunidade" : "Nova Oportunidade"}</DialogTitle>
              <DialogDescription>
                {editingOpp ? "Actualize os detalhes da oportunidade" : "Crie uma nova oportunidade para este lead"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Proposta de serviços"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Valor (€)</Label>
                  <Input
                    id="value"
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage">Fase *</Label>
                  <Select value={stageId} onValueChange={setStageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stages?.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data de Fecho Prevista</Label>
                <Input
                  id="date"
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionais..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createOpportunity.isPending || updateOpportunity.isPending}
              >
                {editingOpp ? "Guardar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Opportunities List */}
      {!opportunities?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h4 className="font-medium text-foreground mb-2">Sem oportunidades</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Crie a primeira oportunidade de negócio para este lead
            </p>
            <Button onClick={handleOpenCreate} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Criar Oportunidade
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {opportunities.map((opp) => {
              const stage = opp.stage;
              const status = statusConfig[opp.status];

              return (
                <Card key={opp.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground truncate">{opp.title}</h4>
                          <Badge variant="outline" className={cn("text-xs gap-1", status.className)}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {stage && (
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              <span>{stage.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Euro className="w-3.5 h-3.5" />
                            <span className="font-medium text-foreground">
                              {formatCurrency(Number(opp.value))}
                            </span>
                          </div>
                          {opp.expected_close_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDate(opp.expected_close_date)}</span>
                            </div>
                          )}
                        </div>
                        {opp.notes && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                            {opp.notes}
                          </p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(opp)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/dashboard/opportunities?id=${opp.id}`}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver no Pipeline
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {opp.status !== "won" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(opp, "won")}>
                              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                              Marcar como Ganha
                            </DropdownMenuItem>
                          )}
                          {opp.status !== "lost" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(opp, "lost")}>
                              <XCircle className="w-4 h-4 mr-2 text-red-500" />
                              Marcar como Perdida
                            </DropdownMenuItem>
                          )}
                          {opp.status !== "open" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(opp, "open")}>
                              <Clock className="w-4 h-4 mr-2 text-blue-500" />
                              Reabrir
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
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar Oportunidade</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem a certeza que deseja eliminar esta oportunidade? Esta acção não pode ser revertida.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(opp)}
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
