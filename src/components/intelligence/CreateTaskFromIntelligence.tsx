import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTask } from "@/hooks/useTasks";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { addDays, format } from "date-fns";

interface CreateTaskFromIntelligenceProps {
  dealId: string;
  prefilledTitle: string;
  suggestedDueDays?: number;
  nbaType: string;
  healthLabel: string;
  onClose: () => void;
}

export function CreateTaskFromIntelligence({
  dealId,
  prefilledTitle,
  suggestedDueDays = 2,
  nbaType,
  healthLabel,
  onClose,
}: CreateTaskFromIntelligenceProps) {
  const [title, setTitle] = useState(prefilledTitle);
  const createTask = useCreateTask();
  const { trackTaskCreatedFromIntelligence } = useCRMAnalytics();

  const dueDate = format(addDays(new Date(), suggestedDueDays), "yyyy-MM-dd'T'HH:mm");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        related_type: "opportunity",
        related_id: dealId,
        due_at: new Date(dueDate).toISOString(),
        status: "pending",
      });
      trackTaskCreatedFromIntelligence({ nba_type: nbaType, health_label: healthLabel, suggested_due_days: suggestedDueDays });
      toast.success("Tarefa criada com sucesso");
      onClose();
    } catch {
      toast.error("Erro ao criar tarefa");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div className="space-y-1.5">
        <Label htmlFor="task-title" className="text-xs">Tarefa</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da tarefa"
          className="h-8 text-sm"
          autoFocus
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Prazo: {format(new Date(dueDate), "dd/MM/yyyy HH:mm")}
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-7 text-xs gap-1" disabled={createTask.isPending}>
          {createTask.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3 h-3" />
          )}
          Criar
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
