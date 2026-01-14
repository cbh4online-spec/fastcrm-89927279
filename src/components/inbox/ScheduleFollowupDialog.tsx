import { useState } from "react";
import { useCreateTask } from "@/hooks/useTasks";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";
import { useExecuteInboxAction } from "@/hooks/useInboxActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarClock, Clock } from "lucide-react";
import { toast } from "sonner";
import { addHours, addDays, format } from "date-fns";

interface ScheduleFollowupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  leadId: string;
  leadName: string;
}

const quickOptions = [
  { label: "Em 1 hora", hours: 1 },
  { label: "Em 2 horas", hours: 2 },
  { label: "Em 4 horas", hours: 4 },
  { label: "Amanhã", hours: 24 },
  { label: "Em 2 dias", hours: 48 },
  { label: "Em 1 semana", hours: 168 },
];

export function ScheduleFollowupDialog({
  open,
  onOpenChange,
  conversationId,
  leadId,
  leadName,
}: ScheduleFollowupDialogProps) {
  const [title, setTitle] = useState(`Follow-up: ${leadName}`);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");

  const { data: agents } = useAgentMembers();
  const createTask = useCreateTask();
  const executeAction = useExecuteInboxAction();

  const handleQuickSelect = (hours: number) => {
    const date = hours < 24 
      ? addHours(new Date(), hours) 
      : addDays(new Date(), Math.floor(hours / 24));
    setDueDate(format(date, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    try {
      const task = await createTask.mutateAsync({
        title: title.trim(),
        related_type: "lead",
        related_id: leadId,
        due_at: dueDate || undefined,
        assigned_to: assignedTo || undefined,
      });

      // Log the inbox action
      await executeAction.mutateAsync({
        conversationId,
        leadId,
        actionType: "schedule_followup",
        actionData: {
          task_id: task.id,
          title: task.title,
          due_at: dueDate,
          assigned_to: assignedTo,
        },
      });

      toast.success("Follow-up agendado com sucesso");
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("Erro ao agendar follow-up");
    }
  };

  const resetForm = () => {
    setTitle(`Follow-up: ${leadName}`);
    setNotes("");
    setDueDate("");
    setAssignedTo("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" />
            Agendar Follow-up
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descreva o follow-up..."
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Agendar para
            </Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {quickOptions.map((option) => (
                <Button
                  key={option.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(option.hours)}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Atribuir a</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar agente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Não atribuído</SelectItem>
                {agents?.map((agent) => (
                  <SelectItem key={agent.user_id} value={agent.user_id}>
                    {agent.profile?.full_name || agent.profile?.email || "Agente"}
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
              placeholder="Adicionar contexto sobre o follow-up..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || createTask.isPending}
          >
            <CalendarClock className="w-4 h-4 mr-2" />
            Agendar Follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
