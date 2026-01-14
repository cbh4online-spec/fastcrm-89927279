import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTask, TaskRelatedType } from "@/hooks/useTasks";
import { toast } from "sonner";

interface QuickTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatedId: string;
  relatedType: TaskRelatedType;
}

export function QuickTaskDialog({
  open,
  onOpenChange,
  relatedId,
  relatedType,
}: QuickTaskDialogProps) {
  const [title, setTitle] = useState("");
  const createTask = useCreateTask();

  const handleSubmit = async () => {
    if (!title.trim() || !relatedId) return;

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        related_id: relatedId,
        related_type: relatedType,
      });
      toast.success("Tarefa criada com sucesso!");
      setTitle("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível criar a tarefa.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>
            Adicione uma tarefa rápida. Pode editar os detalhes depois.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title">O que precisa fazer?</Label>
            <Input
              id="task-title"
              placeholder="Ex: Ligar para confirmar reunião"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) {
                  handleSubmit();
                }
              }}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createTask.isPending}>
            {createTask.isPending ? "A criar..." : "Criar Tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
