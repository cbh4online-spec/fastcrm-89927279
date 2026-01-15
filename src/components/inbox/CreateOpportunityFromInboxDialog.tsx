import { useState } from "react";
import { useCreateOpportunity } from "@/hooks/useOpportunities";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useExecuteInboxAction, useCheckAutomationsForAction } from "@/hooks/useInboxActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import { Zap, Target, FileText } from "lucide-react";
import { toast } from "sonner";
import { AutomationConfirmDialog } from "./AutomationConfirmDialog";
import { CreateProposalDialog } from "@/components/proposals/CreateProposalDialog";

interface CreateOpportunityFromInboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  leadId: string;
  leadName: string;
}

export function CreateOpportunityFromInboxDialog({
  open,
  onOpenChange,
  conversationId,
  leadId,
  leadName,
}: CreateOpportunityFromInboxDialogProps) {
  const [title, setTitle] = useState(`Oportunidade - ${leadName}`);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [showAutomationConfirm, setShowAutomationConfirm] = useState(false);
  const [createProposalAfter, setCreateProposalAfter] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [createdOpportunityId, setCreatedOpportunityId] = useState<string | null>(null);

  const { data: stages } = usePipelineStages();
  const createOpportunity = useCreateOpportunity();
  const executeAction = useExecuteInboxAction();
  
  const matchingAutomations = useCheckAutomationsForAction("create_opportunity");
  const hasAutomations = matchingAutomations.length > 0;

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
        },
        triggerAutomation,
        automationRuleId: automationId,
      });

      toast.success("Oportunidade criada com sucesso");
      
      if (createProposalAfter) {
        setCreatedOpportunityId(opportunity.id);
        onOpenChange(false);
        setShowProposalDialog(true);
      } else {
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
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

  const resetForm = () => {
    setTitle(`Oportunidade - ${leadName}`);
    setValue("");
    setNotes("");
    setSelectedStageId("");
    setCreateProposalAfter(false);
    setCreatedOpportunityId(null);
  };

  const handleProposalClose = (open: boolean) => {
    setShowProposalDialog(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Criar Oportunidade
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome da oportunidade"
              />
            </div>

            <div>
              <Label>Valor (€)</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Etapa do Pipeline</Label>
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
                placeholder="Adicionar notas sobre a oportunidade..."
                rows={3}
              />
            </div>

            {hasAutomations && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-amber-700 dark:text-amber-400">
                  {matchingAutomations.length} automação(ões) será(ão) acionada(s)
                </span>
              </div>
            )}

            {/* Create Proposal Option */}
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <Checkbox
                id="create-proposal"
                checked={createProposalAfter}
                onCheckedChange={(checked) => setCreateProposalAfter(checked === true)}
              />
              <label 
                htmlFor="create-proposal" 
                className="flex items-center gap-2 text-sm cursor-pointer flex-1"
              >
                <FileText className="w-4 h-4 text-primary" />
                Criar proposta após guardar
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || createOpportunity.isPending}
            >
              {hasAutomations && <Zap className="w-4 h-4 mr-2" />}
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

      {/* Create Proposal Dialog */}
      {createdOpportunityId && (
        <CreateProposalDialog
          open={showProposalDialog}
          onOpenChange={handleProposalClose}
          opportunityId={createdOpportunityId}
        />
      )}
    </>
  );
}
