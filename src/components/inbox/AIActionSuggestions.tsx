import { useState } from "react";
import { useInboxActionSuggestions, ActionSuggestion, ActionType } from "@/hooks/useInboxActionSuggestions";
import { Message } from "@/hooks/useMessages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  RefreshCw,
  MessageSquare,
  Target,
  FileText,
  Clock,
  UserPlus,
  AlertCircle,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateOpportunity } from "@/hooks/useOpportunities";
import { useCreateTask } from "@/hooks/useTasks";
import { useAssignConversation } from "@/hooks/useConversations";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";

interface AIActionSuggestionsProps {
  conversationId: string;
  messages: Message[] | undefined;
  leadId?: string;
  leadData?: {
    name?: string;
    status?: string;
    source?: string;
    tags?: string[];
  };
  opportunityData?: {
    id?: string;
    title?: string;
    value?: number;
    stage?: string;
    status?: string;
  };
  proposalData?: {
    count: number;
    hasAccepted: boolean;
    hasPending: boolean;
  };
  conversationData?: {
    channel: string;
    status: string;
    assignedTo?: string;
    hoursSinceLastMessage?: number;
    temperature?: number;
  };
  onReplyClick?: () => void;
  onProposalClick?: (opportunityId: string) => void;
  className?: string;
}

const actionConfig: Record<ActionType, {
  icon: React.ElementType;
  label: string;
  color: string;
}> = {
  reply_now: {
    icon: MessageSquare,
    label: "Responder Agora",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  },
  create_opportunity: {
    icon: Target,
    label: "Criar Oportunidade",
    color: "text-green-500 bg-green-500/10 border-green-500/30",
  },
  send_proposal: {
    icon: FileText,
    label: "Enviar Proposta",
    color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
  },
  schedule_followup: {
    icon: Clock,
    label: "Agendar Follow-up",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  },
  assign_conversation: {
    icon: UserPlus,
    label: "Atribuir Conversa",
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
  },
};

const priorityConfig: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-muted-foreground",
};

export function AIActionSuggestions({
  conversationId,
  messages,
  leadId,
  leadData,
  opportunityData,
  proposalData,
  conversationData,
  onReplyClick,
  onProposalClick,
  className,
}: AIActionSuggestionsProps) {
  const { suggestions, isLoading, error, refresh } = useInboxActionSuggestions({
    conversationId,
    messages,
    leadData,
    opportunityData,
    proposalData,
    conversationData,
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: ActionType | null;
    suggestion: ActionSuggestion | null;
  }>({ open: false, action: null, suggestion: null });

  // Form states for different actions
  const [opportunityTitle, setOpportunityTitle] = useState("");
  const [opportunityValue, setOpportunityValue] = useState("");
  const [opportunityStage, setOpportunityStage] = useState("");
  const [followupTitle, setFollowupTitle] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const [assignTo, setAssignTo] = useState("");

  const { data: stages } = usePipelineStages();
  const { data: agents } = useAgentMembers();
  const createOpportunity = useCreateOpportunity();
  const createTask = useCreateTask();
  const assignConversation = useAssignConversation();

  const handleActionClick = (suggestion: ActionSuggestion) => {
    // Pre-fill form data based on context
    if (suggestion.action === "create_opportunity") {
      setOpportunityTitle(`Oportunidade - ${leadData?.name || "Lead"}`);
      // Try to extract value from context
      if (suggestion.context) {
        const valueMatch = suggestion.context.match(/€?\s*(\d+(?:[.,]\d+)?)/);
        if (valueMatch) {
          setOpportunityValue(valueMatch[1].replace(",", "."));
        }
      }
    } else if (suggestion.action === "schedule_followup") {
      setFollowupTitle("Follow-up: " + (suggestion.reason || "Acompanhamento"));
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setFollowupDate(tomorrow.toISOString().slice(0, 16));
    }

    setConfirmDialog({ open: true, action: suggestion.action, suggestion });
  };

  const handleConfirmAction = async () => {
    const { action, suggestion } = confirmDialog;
    if (!action) return;

    try {
      switch (action) {
        case "reply_now":
          onReplyClick?.();
          toast.success("Foco na caixa de resposta");
          break;

        case "create_opportunity":
          if (!leadId || !stages?.[0]) {
            toast.error("Dados insuficientes para criar oportunidade");
            return;
          }
          await createOpportunity.mutateAsync({
            title: opportunityTitle || `Oportunidade - ${leadData?.name}`,
            lead_id: leadId,
            value: parseFloat(opportunityValue) || 0,
            stage_id: opportunityStage || stages[0].id,
          });
          toast.success("Oportunidade criada!");
          break;

        case "send_proposal":
          if (opportunityData?.id) {
            onProposalClick?.(opportunityData.id);
          } else {
            toast.info("Crie uma oportunidade primeiro para enviar proposta");
          }
          break;

        case "schedule_followup":
          if (!leadId) {
            toast.error("Lead não encontrado");
            return;
          }
          await createTask.mutateAsync({
            title: followupTitle || "Follow-up",
            related_type: "lead",
            related_id: leadId,
            due_at: followupDate || undefined,
          });
          toast.success("Follow-up agendado!");
          break;

        case "assign_conversation":
          if (!conversationId) return;
          await assignConversation.mutateAsync({
            conversationId,
            assignTo: assignTo || null,
          });
          toast.success("Conversa atribuída!");
          break;
      }

      setConfirmDialog({ open: false, action: null, suggestion: null });
      // Reset form states
      setOpportunityTitle("");
      setOpportunityValue("");
      setOpportunityStage("");
      setFollowupTitle("");
      setFollowupDate("");
      setAssignTo("");
    } catch (err) {
      console.error("Action error:", err);
      toast.error("Erro ao executar ação");
    }
  };

  const renderDialogContent = () => {
    const { action, suggestion } = confirmDialog;
    if (!action || !suggestion) return null;

    const config = actionConfig[action];

    switch (action) {
      case "reply_now":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <config.icon className="w-5 h-5" />
                {config.label}
              </DialogTitle>
              <DialogDescription>
                {suggestion.reason}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Clique em confirmar para focar na caixa de resposta.
              </p>
            </div>
          </>
        );

      case "create_opportunity":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <config.icon className="w-5 h-5" />
                {config.label}
              </DialogTitle>
              <DialogDescription>
                {suggestion.reason}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={opportunityTitle}
                  onChange={(e) => setOpportunityTitle(e.target.value)}
                  placeholder="Nome da oportunidade"
                />
              </div>
              <div>
                <Label>Valor (€)</Label>
                <Input
                  type="number"
                  value={opportunityValue}
                  onChange={(e) => setOpportunityValue(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Etapa</Label>
                <Select value={opportunityStage} onValueChange={setOpportunityStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar etapa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stages?.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        );

      case "send_proposal":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <config.icon className="w-5 h-5" />
                {config.label}
              </DialogTitle>
              <DialogDescription>
                {suggestion.reason}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {opportunityData?.id ? (
                <p className="text-sm">
                  Será aberto o editor de proposta para a oportunidade "{opportunityData.title}".
                </p>
              ) : (
                <p className="text-sm text-amber-600">
                  Crie uma oportunidade primeiro para poder enviar uma proposta.
                </p>
              )}
            </div>
          </>
        );

      case "schedule_followup":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <config.icon className="w-5 h-5" />
                {config.label}
              </DialogTitle>
              <DialogDescription>
                {suggestion.reason}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Título da tarefa</Label>
                <Input
                  value={followupTitle}
                  onChange={(e) => setFollowupTitle(e.target.value)}
                  placeholder="Ex: Ligar para confirmar interesse"
                />
              </div>
              <div>
                <Label>Data e hora</Label>
                <Input
                  type="datetime-local"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                />
              </div>
            </div>
          </>
        );

      case "assign_conversation":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <config.icon className="w-5 h-5" />
                {config.label}
              </DialogTitle>
              <DialogDescription>
                {suggestion.reason}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Atribuir a</Label>
                <Select value={assignTo} onValueChange={setAssignTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar membro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents?.map((agent) => (
                      <SelectItem key={agent.user_id} value={agent.user_id}>
                        {agent.profile?.full_name || agent.profile?.email || "Membro"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  if (!conversationId || !messages || messages.length === 0) {
    return null;
  }

  if (isLoading && suggestions.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-medium">A analisar conversa...</span>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error && suggestions.length === 0) {
    return (
      <Card className={cn("border-dashed border-destructive/30", className)}>
        <CardContent className="px-3 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="flex-1 text-xs">Erro ao obter sugestões</span>
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={refresh}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <>
      <Card className={cn("bg-gradient-to-br from-primary/5 to-transparent border-primary/20", className)}>
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Ações Sugeridas por AI
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          {suggestions.map((suggestion, index) => {
            const config = actionConfig[suggestion.action];
            const Icon = config.icon;
            
            return (
              <button
                key={index}
                onClick={() => handleActionClick(suggestion)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-lg border transition-all",
                  "hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]",
                  config.color
                )}
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-background/80">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{config.label}</span>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      priorityConfig[suggestion.priority]
                    )} />
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {suggestion.reason}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
          
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Todas as ações requerem confirmação
          </p>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null, suggestion: null })}
      >
        <DialogContent>
          {renderDialogContent()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, action: null, suggestion: null })}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmAction}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
