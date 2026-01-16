import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle, 
  PhoneForwarded, 
  UserX, 
  XCircle, 
  CalendarClock, 
  Sparkles,
  Loader2,
  Mail,
  MessageCircle,
  ListTodo,
  FileText,
  Copy,
  Check,
  Brain,
  ArrowRight,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { Meeting, MeetingOutcome } from '@/hooks/useMeetings';

interface MeetingCloseModalProps {
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

interface AICloseResult {
  official_summary: string;
  key_decisions: string[];
  tasks: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    suggested_due_days: number;
  }>;
  next_steps: string[];
  followup_email: {
    subject: string;
    body: string;
  };
  followup_whatsapp: string;
  internal_notes: string;
  suggested_followup_date: string;
  client_name: string;
}

const OUTCOMES: { value: MeetingOutcome; label: string; icon: typeof CheckCircle; color: string }[] = [
  { value: 'successful', label: 'Bem sucedida', icon: CheckCircle, color: 'text-green-500 bg-green-500/10' },
  { value: 'needs_followup', label: 'Necessita follow-up', icon: PhoneForwarded, color: 'text-amber-500 bg-amber-500/10' },
  { value: 'no_show', label: 'Não compareceu', icon: UserX, color: 'text-red-500 bg-red-500/10' },
  { value: 'cancelled', label: 'Cancelada', icon: XCircle, color: 'text-muted-foreground bg-muted' },
  { value: 'rescheduled', label: 'Reagendada', icon: CalendarClock, color: 'text-blue-500 bg-blue-500/10' },
];

type Step = 'outcome' | 'bullets' | 'review';

export function MeetingCloseModal({
  isOpen,
  onClose,
  meeting,
  onSaveOutcome,
  onCreateTask,
}: MeetingCloseModalProps) {
  const [step, setStep] = useState<Step>('outcome');
  const [outcome, setOutcome] = useState<MeetingOutcome>('successful');
  const [bullets, setBullets] = useState(['', '', '']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AICloseResult | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentWorkspace } = useWorkspace();

  const isClientMeeting = meeting.category === 'client' || meeting.category === 'hybrid';

  const handleBulletChange = (index: number, value: string) => {
    const newBullets = [...bullets];
    newBullets[index] = value;
    setBullets(newBullets);
  };

  const canProceedFromBullets = bullets.filter(b => b.trim()).length >= 1;

  const generateAISummary = async () => {
    if (!currentWorkspace?.id) return;

    const filledBullets = bullets.filter(b => b.trim());
    if (filledBullets.length === 0) {
      toast.error('Insira pelo menos 1 ponto-chave');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('productivity-coach', {
        body: {
          action: 'close-meeting',
          workspaceId: currentWorkspace.id,
          data: {
            meetingId: meeting.id,
            bullets: filledBullets,
            outcome,
          },
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAiResult(data);
      setSelectedTasks(data.tasks?.map((_: any, i: number) => i) || []);
      setStep('review');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Erro ao gerar resumo. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Save outcome
      await onSaveOutcome(
        outcome,
        aiResult?.official_summary || bullets.filter(b => b.trim()).join('\n'),
        aiResult?.next_steps?.join('\n'),
        aiResult?.suggested_followup_date
      );

      // Create selected tasks
      if (onCreateTask && aiResult?.tasks) {
        for (const index of selectedTasks) {
          const task = aiResult.tasks[index];
          if (task) {
            const dueDate = addDays(new Date(), task.suggested_due_days);
            await onCreateTask(task.title, task.description, dueDate.toISOString());
          }
        }
      }

      toast.success('Reunião fechada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Error closing meeting:', error);
      toast.error('Erro ao fechar reunião');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep('outcome');
    setOutcome('successful');
    setBullets(['', '', '']);
    setAiResult(null);
    setSelectedTasks([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Fechar Reunião com IA
            {isClientMeeting && (
              <Badge variant="secondary" className="ml-2">
                Atualiza CRM
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full",
              step === 'outcome' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <span className="w-5 h-5 flex items-center justify-center text-xs font-medium">1</span>
              <span className="hidden sm:inline">Resultado</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full",
              step === 'bullets' ? "bg-primary text-primary-foreground" : step === 'review' ? "bg-muted" : "bg-muted/50"
            )}>
              <span className="w-5 h-5 flex items-center justify-center text-xs font-medium">2</span>
              <span className="hidden sm:inline">Pontos-chave</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full",
              step === 'review' ? "bg-primary text-primary-foreground" : "bg-muted/50"
            )}>
              <span className="w-5 h-5 flex items-center justify-center text-xs font-medium">3</span>
              <span className="hidden sm:inline">Revisão</span>
            </div>
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-4">
            {/* Step 1: Outcome */}
            {step === 'outcome' && (
              <div className="space-y-4">
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

                <div className="space-y-3">
                  <Label>Como correu a reunião?</Label>
                  <RadioGroup
                    value={outcome}
                    onValueChange={(v) => setOutcome(v as MeetingOutcome)}
                    className="grid grid-cols-1 gap-2"
                  >
                    {OUTCOMES.map((item) => (
                      <div key={item.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={item.value} id={`outcome-${item.value}`} />
                        <Label
                          htmlFor={`outcome-${item.value}`}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer flex-1 p-3 rounded-lg border transition-colors",
                            outcome === item.value && "border-primary bg-primary/5"
                          )}
                        >
                          <div className={cn("p-1.5 rounded-full", item.color)}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Step 2: Bullets */}
            {step === 'bullets' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <Sparkles className="h-8 w-8 mx-auto text-primary mb-2" />
                  <h3 className="font-semibold">3 Pontos-Chave da Reunião</h3>
                  <p className="text-sm text-muted-foreground">
                    Escreva os pontos principais e a IA gera o resto
                  </p>
                </div>

                <div className="space-y-3">
                  {bullets.map((bullet, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0 mt-2">
                        {index + 1}
                      </div>
                      <Textarea
                        value={bullet}
                        onChange={(e) => handleBulletChange(index, e.target.value)}
                        placeholder={
                          index === 0 
                            ? "Ex: Cliente interessado no plano Enterprise..." 
                            : index === 1 
                            ? "Ex: Precisa de aprovação do diretor financeiro..." 
                            : "Ex: Agendar demo para a equipa técnica..."
                        }
                        rows={2}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Mínimo 1 ponto, quanto mais detalhes melhor o resultado
                </p>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 'review' && aiResult && (
              <div className="space-y-4">
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="summary" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Resumo
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="text-xs">
                      <ListTodo className="h-3 w-3 mr-1" />
                      Tarefas
                    </TabsTrigger>
                    <TabsTrigger value="email" className="text-xs">
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </TabsTrigger>
                    <TabsTrigger value="whatsapp" className="text-xs">
                      <MessageCircle className="h-3 w-3 mr-1" />
                      WhatsApp
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          Resumo Oficial
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(aiResult.official_summary, 'summary')}
                          >
                            {copiedField === 'summary' ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{aiResult.official_summary}</p>
                      </CardContent>
                    </Card>

                    {aiResult.key_decisions?.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Decisões Tomadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {aiResult.key_decisions.map((decision, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {decision}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {aiResult.next_steps?.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Próximos Passos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ol className="space-y-1">
                            {aiResult.next_steps.map((step, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                                  {i + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>
                    )}

                    {aiResult.internal_notes && (
                      <Card className="border-amber-500/50 bg-amber-500/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-amber-600">Notas Internas (CRM)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{aiResult.internal_notes}</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="tasks" className="space-y-3 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Selecione as tarefas a criar:
                    </p>
                    {aiResult.tasks?.map((task, index) => (
                      <Card 
                        key={index}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedTasks.includes(index) && "border-primary bg-primary/5"
                        )}
                        onClick={() => {
                          setSelectedTasks(prev => 
                            prev.includes(index) 
                              ? prev.filter(i => i !== index)
                              : [...prev, index]
                          );
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedTasks.includes(index)}
                              onCheckedChange={() => {
                                setSelectedTasks(prev => 
                                  prev.includes(index) 
                                    ? prev.filter(i => i !== index)
                                    : [...prev, index]
                                );
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{task.title}</span>
                                <Badge 
                                  variant={
                                    task.priority === 'high' ? 'destructive' : 
                                    task.priority === 'medium' ? 'default' : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Prazo sugerido: {format(addDays(new Date(), task.suggested_due_days), 'd MMM', { locale: pt })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="email" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          Email de Follow-up
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(
                              `Assunto: ${aiResult.followup_email.subject}\n\n${aiResult.followup_email.body}`,
                              'email'
                            )}
                          >
                            {copiedField === 'email' ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Assunto</Label>
                          <p className="text-sm font-medium">{aiResult.followup_email.subject}</p>
                        </div>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Corpo</Label>
                          <p className="text-sm whitespace-pre-wrap">{aiResult.followup_email.body}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="whatsapp" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          Mensagem WhatsApp
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(aiResult.followup_whatsapp, 'whatsapp')}
                          >
                            {copiedField === 'whatsapp' ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{aiResult.followup_whatsapp}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {aiResult.followup_whatsapp.length} caracteres
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="flex justify-between gap-2 p-4">
          {step === 'outcome' && (
            <>
              <Button variant="outline" onClick={resetAndClose}>
                Cancelar
              </Button>
              <Button onClick={() => setStep('bullets')}>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 'bullets' && (
            <>
              <Button variant="outline" onClick={() => setStep('outcome')}>
                Voltar
              </Button>
              <Button 
                onClick={generateAISummary} 
                disabled={!canProceedFromBullets || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A gerar...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar com IA
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'review' && (
            <>
              <Button variant="outline" onClick={() => setStep('bullets')}>
                Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A guardar...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Fechar Reunião
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
