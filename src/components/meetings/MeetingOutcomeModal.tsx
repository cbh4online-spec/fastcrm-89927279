import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  PhoneForwarded, 
  UserX, 
  XCircle, 
  CalendarClock, 
  CalendarIcon,
  Plus,
  ListTodo,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Meeting, MeetingOutcome } from '@/hooks/useMeetings';

interface MeetingOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  onSaveOutcome: (
    outcome: MeetingOutcome,
    outcomeNotes?: string,
    nextSteps?: string,
    followUpDate?: string
  ) => Promise<void>;
  onCreateTask?: (title: string, description?: string, dueDate?: string) => Promise<void>;
}

const OUTCOMES: { value: MeetingOutcome; label: string; icon: typeof CheckCircle; color: string }[] = [
  { value: 'successful', label: 'Bem sucedida', icon: CheckCircle, color: 'text-green-500' },
  { value: 'needs_followup', label: 'Necessita follow-up', icon: PhoneForwarded, color: 'text-amber-500' },
  { value: 'no_show', label: 'Não compareceu', icon: UserX, color: 'text-red-500' },
  { value: 'cancelled', label: 'Cancelada', icon: XCircle, color: 'text-muted-foreground' },
  { value: 'rescheduled', label: 'Reagendada', icon: CalendarClock, color: 'text-blue-500' },
];

export function MeetingOutcomeModal({
  isOpen,
  onClose,
  meeting,
  onSaveOutcome,
  onCreateTask,
}: MeetingOutcomeModalProps) {
  const [outcome, setOutcome] = useState<MeetingOutcome | null>(meeting.outcome || null);
  const [outcomeNotes, setOutcomeNotes] = useState(meeting.outcome_notes || '');
  const [nextSteps, setNextSteps] = useState(meeting.next_steps || '');
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(
    meeting.follow_up_date ? new Date(meeting.follow_up_date) : undefined
  );
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isClientMeeting = meeting.category === 'client' || meeting.category === 'hybrid';

  const handleSubmit = async () => {
    if (!outcome) return;

    setIsSubmitting(true);
    try {
      await onSaveOutcome(
        outcome,
        outcomeNotes || undefined,
        nextSteps || undefined,
        followUpDate?.toISOString()
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !onCreateTask) return;

    setIsSubmitting(true);
    try {
      await onCreateTask(
        taskTitle,
        taskDescription || undefined,
        taskDueDate?.toISOString()
      );
      setShowTaskForm(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueDate(undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Registar Resultado
            {isClientMeeting && (
              <Badge variant="secondary" className="ml-2">
                Regista no CRM
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Meeting Info */}
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="font-medium">{meeting.title}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(meeting.start_time), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: pt })}
            </p>
            {meeting.contact && (
              <p className="text-sm text-muted-foreground mt-1">
                Com: {meeting.contact.name}
              </p>
            )}
          </div>

          {/* Outcome Selection */}
          <div className="space-y-3">
            <Label>Resultado da Reunião</Label>
            <RadioGroup
              value={outcome || ''}
              onValueChange={(v) => setOutcome(v as MeetingOutcome)}
              className="grid grid-cols-1 gap-2"
            >
              {OUTCOMES.map((item) => (
                <div key={item.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={item.value} id={item.value} />
                  <Label
                    htmlFor={item.value}
                    className="flex items-center gap-2 cursor-pointer flex-1 p-2 rounded-md hover:bg-muted/50"
                  >
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    {item.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="outcomeNotes">Notas do Resultado</Label>
            <Textarea
              id="outcomeNotes"
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="Descrever o que foi discutido, decisões tomadas..."
              rows={3}
            />
          </div>

          {/* Next Steps - only for follow-up outcomes */}
          {(outcome === 'successful' || outcome === 'needs_followup') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nextSteps">Próximos Passos</Label>
                <Textarea
                  id="nextSteps"
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  placeholder="O que precisa de ser feito a seguir..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Follow-up</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {followUpDate ? (
                        format(followUpDate, 'PPP', { locale: pt })
                      ) : (
                        <span className="text-muted-foreground">Selecionar data...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={followUpDate}
                      onSelect={setFollowUpDate}
                      locale={pt}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {/* Create Task Section */}
          {isClientMeeting && onCreateTask && (
            <>
              <Separator />
              
              {!showTaskForm ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowTaskForm(true)}
                >
                  <ListTodo className="mr-2 h-4 w-4" />
                  Criar Tarefa de Follow-up
                </Button>
              ) : (
                <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Nova Tarefa</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTaskForm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                  
                  <Input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Título da tarefa..."
                  />
                  
                  <Textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Descrição (opcional)..."
                    rows={2}
                  />
                  
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {taskDueDate ? format(taskDueDate, 'dd/MM') : 'Data limite'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={taskDueDate}
                          onSelect={setTaskDueDate}
                          locale={pt}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Button
                      size="sm"
                      onClick={handleCreateTask}
                      disabled={!taskTitle.trim() || isSubmitting}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Criar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!outcome || isSubmitting}>
            Guardar Resultado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
