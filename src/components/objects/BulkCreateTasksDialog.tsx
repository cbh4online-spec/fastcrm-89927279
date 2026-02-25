import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ListTodo } from "lucide-react";
import { useCreateTask } from "@/hooks/useTasks";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRecords: { id: string; name: string }[];
  relatedType?: string;
}

export function BulkCreateTasksDialog({ open, onOpenChange, selectedRecords, relatedType }: Props) {
  const [titleTemplate, setTitleTemplate] = useState("Follow-up: {name}");
  const [dueDate, setDueDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createTask = useCreateTask();

  const handleCreate = async () => {
    if (!titleTemplate.trim()) return;
    setIsCreating(true);

    try {
      let created = 0;
      for (const record of selectedRecords) {
        const title = titleTemplate.replace(/\{name\}/g, record.name);
        await createTask.mutateAsync({
          title,
          related_type: relatedType as any,
          related_id: record.id,
          due_at: dueDate || undefined,
        });
        created++;
      }
      toast.success(`${created} tarefa(s) criada(s)`);
      onOpenChange(false);
      setTitleTemplate("Follow-up: {name}");
      setDueDate("");
    } catch (err) {
      toast.error("Erro ao criar tarefas");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Criar tarefas em massa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Título da tarefa</Label>
            <Input
              value={titleTemplate}
              onChange={(e) => setTitleTemplate(e.target.value)}
              placeholder="Follow-up: {name}"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use <code className="bg-muted px-1 rounded">{"{name}"}</code> para inserir o nome do registo
            </p>
          </div>
          <div>
            <Label>Data limite (opcional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Serão criadas <strong>{selectedRecords.length}</strong> tarefa(s) para os registos selecionados.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!titleTemplate.trim() || isCreating}>
            {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Criar {selectedRecords.length} tarefa(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
