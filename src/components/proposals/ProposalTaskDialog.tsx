import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTask } from "@/hooks/useTasks";
import { Loader2, CheckSquare } from "lucide-react";
import { format, addDays } from "date-fns";
import type { Proposal } from "@/types/proposal";

interface ProposalTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal | null;
}

export function ProposalTaskDialog({
  open,
  onOpenChange,
  proposal,
}: ProposalTaskDialogProps) {
  const createTask = useCreateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 3), "yyyy-MM-dd"));

  // Initialize form when proposal changes
  useEffect(() => {
    if (proposal && open) {
      setTitle(`Follow-up: ${proposal.title}`);
      setDescription(`Acompanhamento da proposta "${proposal.title}"`);
      setDueDate(format(addDays(new Date(), 3), "yyyy-MM-dd"));
    }
  }, [proposal, open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate(format(addDays(new Date(), 3), "yyyy-MM-dd"));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !proposal) return;

    await createTask.mutateAsync({
      title: title.trim(),
      related_type: "opportunity",
      related_id: proposal.opportunity_id,
      due_at: dueDate ? `${dueDate}T23:59:59Z` : undefined,
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Nova Tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Follow-up proposta"
            />
          </div>

          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes da tarefa..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label>Data Limite</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {proposal && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p>
                <strong>Proposta:</strong> {proposal.title}
              </p>
              {proposal.opportunity?.title && (
                <p>
                  <strong>Oportunidade:</strong> {proposal.opportunity.title}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createTask.isPending || !title.trim()}>
            {createTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
