import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, Trash2, UserCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Task } from "@/hooks/useTasks";
import { TaskPriority, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from "@/types/taskTemplate";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: { title?: string; due_at?: string | null }) => void;
  onDelete: (id: string) => void;
}

export function EditTaskDialog({ task, open, onOpenChange, onSave, onDelete }: EditTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<TaskPriority>("medium");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDueDate(task.due_at ? new Date(task.due_at) : undefined);
    }
  }, [task]);

  if (!task) return null;

  const handleSave = () => {
    onSave(task.id, {
      title: title.trim() || task.title,
      due_at: dueDate?.toISOString() ?? null,
    });
    onOpenChange(false);
  };

  const quickDates = [
    { label: "Hoje", days: 0 },
    { label: "Amanhã", days: 1 },
    { label: "3 dias", days: 3 },
    { label: "1 semana", days: 7 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as TaskPriority[]).map((p) => (
                <Button
                  key={p}
                  variant={priority === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPriority(p)}
                  className={cn(priority === p && TASK_PRIORITY_COLORS[p])}
                >
                  {TASK_PRIORITY_LABELS[p]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data Limite</Label>
            <div className="flex gap-2 flex-wrap mb-2">
              {quickDates.map((qd) => (
                <Button
                  key={qd.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setDueDate(addDays(new Date(), qd.days))}
                  className="text-xs"
                >
                  {qd.label}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setDueDate(undefined)} className="text-xs">
                Sem data
              </Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP", { locale: pt }) : "Escolher data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus locale={pt} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter className="flex !justify-between">
          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-500/10 gap-1" onClick={() => { onDelete(task.id); onOpenChange(false); }}>
            <Trash2 className="w-4 h-4" /> Eliminar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!title.trim()}>Guardar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
