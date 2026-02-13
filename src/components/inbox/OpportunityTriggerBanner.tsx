import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Target,
  Sparkles,
  X,
  DollarSign,
  MessageSquare,
  Calendar,
  FileText,
  Zap,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { useCreateOpportunity } from "@/hooks/useOpportunities";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useExecuteInboxAction, useCheckAutomationsForAction } from "@/hooks/useInboxActions";
import { OpportunityTrigger } from "@/hooks/useInboxActionSuggestions";
import { AutomationConfirmDialog } from "./AutomationConfirmDialog";
import { CreateProposalDialog } from "@/components/proposals/CreateProposalDialog";

interface OpportunityTriggerBannerProps {
  trigger: OpportunityTrigger;
  conversationId: string;
  leadId: string;
  leadName: string;
  leadEmail?: string;
  companyName?: string;
  onDismiss: () => void;
}

const triggerIcons: Record<string, React.ElementType> = {
  price: DollarSign,
  negotiation: MessageSquare,
  meeting: Calendar,
  proposal: FileText,
  interest: Target,
};

const triggerLabels: Record<string, string> = {
  price: "Preço",
  negotiation: "Negociação",
  meeting: "Reunião",
  proposal: "Proposta",
  interest: "Interesse",
};

export function OpportunityTriggerBanner({
  trigger,
  conversationId,
  leadId,
  leadName,
  leadEmail,
  companyName,
  onDismiss,
}: OpportunityTriggerBannerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [showAutomationConfirm, setShowAutomationConfirm] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [createdOpportunityId, setCreatedOpportunityId] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [notes, setNotes] = useState("");
  const [createProposalAfter, setCreateProposalAfter] = useState(false);

  const { data: stages } = usePipelineStages();
  const createOpportunity = useCreateOpportunity();
  const executeAction = useExecuteInboxAction();
  const { trackOpportunityCreated, trackConversationConverted } = useCRMAnalytics();
  
  const matchingAutomations = useCheckAutomationsForAction("create_opportunity");
  const hasAutomations = matchingAutomations.length > 0;

  // Pre-fill form when trigger changes
  useEffect(() => {
    if (trigger.prefillData) {
      if (trigger.prefillData.title) {
        setTitle(trigger.prefillData.title);
      } else if (leadName) {
        setTitle(`Oportunidade - ${leadName}`);
      }
      
      if (trigger.prefillData.value) {
        setValue(trigger.prefillData.value.toString());
      }
      
      if (trigger.prefillData.context) {
        setNotes(`Contexto da conversa: ${trigger.prefillData.context}`);
      }
    }
  }, [trigger, leadName]);

  const handleOpenDialog = () => {
    setShowDialog(true);
  };

  const handleSubmit = async (
    triggerAutomation: boolean = false,
    automationId?: string
  ) => {
    if (!title.trim() || !stages?.[0]) return;

    try {
      const opportunity = await createOpportunity.mutateAsync({
        title: title.trim(),
        lead_id: leadId,
        value: parseFloat(value) || 0,
        stage_id: selectedStageId || stages[0].id,
        notes: notes.trim() || undefined,
      });

      // Log the inbox action
      await executeAction.mutateAsync({
        conversationId,
        leadId,
        actionType: "create_opportunity",
        actionData: {
          opportunity_id: opportunity.id,
          title: opportunity.title,
          value: opportunity.value,
          triggers: trigger.triggers,
        },
        triggerAutomation,
        automationRuleId: automationId,
      });

      trackOpportunityCreated({ value: parseFloat(value) || 0, origin: 'inbox' });
      trackConversationConverted({
        days_to_convert: 0,
        used_ai_in_thread: false,
        used_template: false,
        priority_score_at_start: 0,
      });
      
      toast.success("Oportunidade criada com sucesso!");
      
      if (createProposalAfter) {
        setCreatedOpportunityId(opportunity.id);
        setShowDialog(false);
        setShowProposalDialog(true);
      } else {
        setShowDialog(false);
        onDismiss();
      }
    } catch (error) {
      console.error("Error creating opportunity:", error);
      toast.error("Erro ao criar oportunidade");
    }
  };

  const handleCreate = () => {
    if (hasAutomations) {
      setShowAutomationConfirm(true);
    } else {
      handleSubmit(false);
    }
  };

  const priorityColors = {
    high: "from-red-500/20 via-orange-500/10 to-transparent border-red-500/40",
    medium: "from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/40",
    low: "from-green-500/20 via-emerald-500/10 to-transparent border-green-500/40",
  };

  return (
    <>
      <div
        className={cn(
          "mx-3 mt-2 p-3 rounded-lg border bg-gradient-to-r",
          priorityColors[trigger.priority]
        )}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Target className="w-4 h-4 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">Criar Oportunidade</span>
              <Badge 
                variant="outline" 
                className="text-[10px] py-0 gap-1 border-primary/30 text-primary"
              >
                <Sparkles className="w-2.5 h-2.5" />
                AI
              </Badge>
              {trigger.priority === "high" && (
                <Badge variant="destructive" className="text-[10px] py-0">
                  <AlertCircle className="w-2.5 h-2.5 mr-1" />
                  Alta prioridade
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">
              {trigger.reason}
            </p>
            
            {/* Trigger tags */}
            <div className="flex flex-wrap gap-1 mb-2">
              {trigger.triggers.map((t) => {
                const Icon = triggerIcons[t] || Target;
                return (
                  <Badge 
                    key={t} 
                    variant="secondary" 
                    className="text-[10px] py-0 gap-1"
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {triggerLabels[t] || t}
                  </Badge>
                );
              })}
            </div>

            {/* Pre-filled data preview */}
            {trigger.prefillData.value && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                <span>Valor detectado: €{trigger.prefillData.value.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleOpenDialog}
              className="h-7 text-xs gap-1"
            >
              <Target className="w-3 h-3" />
              Criar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onDismiss}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Create Opportunity Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Criar Oportunidade
            </DialogTitle>
            <DialogDescription>
              {trigger.reason}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Pre-fill info */}
            <div className="p-2 rounded-lg bg-muted/50 text-xs space-y-1">
              <p><strong>Lead:</strong> {leadName}</p>
              {leadEmail && <p><strong>Email:</strong> {leadEmail}</p>}
              {companyName && <p><strong>Empresa:</strong> {companyName}</p>}
            </div>

            <div>
              <Label>Título da Oportunidade</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome da oportunidade"
              />
            </div>

            <div>
              <Label>Valor Estimado (€)</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
              />
              {trigger.prefillData.value && !value && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-6 p-0 text-xs"
                  onClick={() => setValue(trigger.prefillData.value!.toString())}
                >
                  Usar valor detectado: €{trigger.prefillData.value.toLocaleString()}
                </Button>
              )}
            </div>

            <div>
              <Label>Etapa Inicial</Label>
              <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar etapa..." />
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

            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicionar notas..."
                rows={2}
              />
            </div>

            {hasAutomations && (
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-700 dark:text-amber-400">
                  {matchingAutomations.length} automação(ões) será(ão) acionada(s)
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30">
              <Checkbox
                id="create-proposal-trigger"
                checked={createProposalAfter}
                onCheckedChange={(checked) => setCreateProposalAfter(checked === true)}
              />
              <label 
                htmlFor="create-proposal-trigger" 
                className="flex items-center gap-2 text-xs cursor-pointer flex-1"
              >
                <FileText className="w-3 h-3 text-primary" />
                Criar proposta após guardar
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || createOpportunity.isPending}
            >
              {hasAutomations && <Zap className="w-4 h-4 mr-1" />}
              Criar Oportunidade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AutomationConfirmDialog
        open={showAutomationConfirm}
        onOpenChange={setShowAutomationConfirm}
        actionLabel="Criar Oportunidade"
        automations={matchingAutomations}
        onConfirm={handleSubmit}
      />

      {createdOpportunityId && (
        <CreateProposalDialog
          open={showProposalDialog}
          onOpenChange={(open) => {
            setShowProposalDialog(open);
            if (!open) onDismiss();
          }}
          opportunityId={createdOpportunityId}
        />
      )}
    </>
  );
}
