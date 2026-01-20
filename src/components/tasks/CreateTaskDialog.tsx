import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Sparkles, Loader2, Wand2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TaskPriority, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from "@/types/taskTemplate";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTask: (task: {
    title: string;
    due_at?: string;
    assigned_to?: string;
  }) => void;
  initialTitle?: string;
  initialDueDays?: number;
  entityName: string;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onCreateTask,
  initialTitle = "",
  initialDueDays = 3,
  entityName
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), initialDueDays));
  const [isAIEnhancing, setIsAIEnhancing] = useState(false);

  // Reset form when dialog opens with new initial values
  useState(() => {
    if (open) {
      setTitle(initialTitle);
      setDueDate(addDays(new Date(), initialDueDays));
    }
  });

  const handleSubmit = () => {
    if (!title.trim()) return;
    
    onCreateTask({
      title: title.trim(),
      due_at: dueDate?.toISOString(),
    });
    
    // Reset form
    setTitle("");
    setDescription("");
    setPriority('medium');
    setDueDate(addDays(new Date(), 3));
    onOpenChange(false);
  };

  const handleAIEnhance = async () => {
    setIsAIEnhancing(true);
    // Simulate AI enhancement
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock AI enhancement
    if (title.toLowerCase().includes('ligar')) {
      setTitle(title + ' - confirmar disponibilidade');
      setDescription('Pontos a abordar:\n1. Confirmar receção da proposta\n2. Esclarecer dúvidas\n3. Definir próximos passos');
    } else if (title.toLowerCase().includes('proposta')) {
      setDescription('Incluir:\n• Resumo executivo\n• Detalhes da solução\n• Pricing competitivo\n• Casos de sucesso relevantes');
    }
    
    setIsAIEnhancing(false);
  };

  const quickDates = [
    { label: 'Hoje', days: 0 },
    { label: 'Amanhã', days: 1 },
    { label: '3 dias', days: 3 },
    { label: '1 semana', days: 7 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>
            Criar tarefa para {entityName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title with AI Enhance */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <div className="flex gap-2">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="O que precisa ser feito?"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAIEnhance}
                disabled={isAIEnhancing || !title.trim()}
                title="Melhorar com IA"
              >
                {isAIEnhancing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Notas (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais..."
              rows={3}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                <Button
                  key={p}
                  variant={priority === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPriority(p)}
                  className={cn(
                    priority === p && TASK_PRIORITY_COLORS[p]
                  )}
                >
                  {TASK_PRIORITY_LABELS[p]}
                </Button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Data Limite</Label>
            <div className="flex gap-2 flex-wrap mb-2">
              {quickDates.map((qd) => (
                <Button
                  key={qd.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setDueDate(addDays(new Date(), qd.days))}
                  className={cn(
                    "text-xs",
                    dueDate && format(dueDate, 'yyyy-MM-dd') === format(addDays(new Date(), qd.days), 'yyyy-MM-dd') &&
                    "bg-primary text-primary-foreground"
                  )}
                >
                  {qd.label}
                </Button>
              ))}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP", { locale: pt }) : "Escolher data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  locale={pt}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* AI Tip */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <p className="text-xs font-medium text-primary">Dica IA</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Usa o botão ✨ para a IA sugerir melhorias ao título e adicionar notas úteis automaticamente.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            Criar Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
