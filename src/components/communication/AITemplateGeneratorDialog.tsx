import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, ArrowRight, ArrowLeft, Check, Lightbulb, Zap } from 'lucide-react';
import { useGenerateTemplate, GeneratedEmailTemplate, GeneratedWhatsAppTemplate } from '@/hooks/useGenerateTemplate';
import { CommunicationTemplate, TemplateChannel, TemplateTone, TemplateStructure } from '@/types/communicationTemplate';
import { useTemplateRecommendations, TemplateRecommendation } from '@/hooks/useTemplateRecommendations';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

interface AITemplateGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (template: Partial<CommunicationTemplate>) => void;
  initialRecommendation?: TemplateRecommendation | null;
}

const GOAL_OPTIONS = [
  { value: 'captar_lead_frio', label: 'Captar lead frio' },
  { value: 'follow_up', label: 'Follow-up comercial' },
  { value: 'upsell', label: 'Upsell / upgrade' },
  { value: 'reativacao', label: 'Reativação de lead inativo' },
  { value: 'onboarding', label: 'Onboarding / boas-vindas' },
  { value: 'convite_evento', label: 'Convite para evento' },
  { value: 'qualificacao', label: 'Qualificação de lead' },
];

const AUDIENCE_OPTIONS = [
  { value: 'empresarios', label: 'Empresários' },
  { value: 'gestores', label: 'Gestores / Directores' },
  { value: 'freelancers', label: 'Freelancers' },
  { value: 'startups', label: 'Startups' },
  { value: 'pme', label: 'PMEs' },
  { value: 'geral', label: 'Público geral' },
];

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Amigável' },
  { value: 'direct', label: 'Direto' },
  { value: 'casual', label: 'Casual' },
];

export function AITemplateGeneratorDialog({ open, onOpenChange, onGenerated, initialRecommendation }: AITemplateGeneratorDialogProps) {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [tone, setTone] = useState<'formal' | 'friendly' | 'direct' | 'casual'>('formal');
  const [appliedRec, setAppliedRec] = useState(false);

  const { recommendations } = useTemplateRecommendations();
  const generateTemplate = useGenerateTemplate();
  const { currentWorkspace } = useWorkspace();

  // The active recommendation: either passed from outside or the top one
  const activeRec = initialRecommendation || (recommendations.length > 0 ? recommendations[0] : null);

  // Apply initial recommendation when dialog opens
  useEffect(() => {
    if (open && initialRecommendation && !appliedRec) {
      applyRecommendation(initialRecommendation);
      setAppliedRec(true);
    }
  }, [open, initialRecommendation]);

  const applyRecommendation = (rec: TemplateRecommendation) => {
    setGoal(rec.goalValue);
    setChannel(rec.channel);
    setTone(rec.tone);
    if (rec.audienceValue) setAudience(rec.audienceValue);
  };

  const handleGenerate = async () => {
    if (!currentWorkspace?.id) {
      toast.error('Workspace ativo não encontrado');
      return;
    }
    const goalLabel = GOAL_OPTIONS.find(g => g.value === goal)?.label || goal;
    const audienceLabel = AUDIENCE_OPTIONS.find(a => a.value === audience)?.label || audience;

    const result = await generateTemplate.mutateAsync({
      type: channel,
      goal: `${goalLabel} para ${audienceLabel}`,
      tone: tone,
      context: {},
      customInstructions: `Estrutura AIDA. Público-alvo: ${audienceLabel}. Objetivo: ${goalLabel}.`,
      workspaceId: currentWorkspace.id,
    });

    // Map generated result to CommunicationTemplate partial
    const templateData: Partial<CommunicationTemplate> = {
      channel: channel as TemplateChannel,
      tone: tone === 'formal' ? 'professional' : tone === 'friendly' ? 'human' : tone === 'direct' ? 'commercial' : 'human',
      structureType: 'AIDA' as TemplateStructure,
      isActive: true,
      language: 'pt',
      journeyContexts: [],
      conversionCount: 0,
    };

    if (channel === 'email') {
      const emailResult = result as GeneratedEmailTemplate;
      templateData.name = emailResult.suggestedName;
      templateData.subject = emailResult.subject;
      templateData.body = emailResult.content;
    } else {
      const waResult = result as GeneratedWhatsAppTemplate;
      templateData.name = waResult.suggestedName;
      templateData.body = waResult.content;
    }

    onGenerated(templateData);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setGoal('');
    setAudience('');
    setChannel('email');
    setTone('formal');
    setAppliedRec(false);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!goal;
      case 2: return !!audience;
      case 3: return !!channel;
      case 4: return !!tone;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Criar Template com IA
          </DialogTitle>
          <DialogDescription>
            Passo {step} de 4
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {/* AI Recommendation Banner */}
        {activeRec && step === 1 && !appliedRec && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{activeRec.goal}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{activeRec.reason}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => {
                applyRecommendation(activeRec);
                setAppliedRec(true);
              }}
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Aceitar recomendação
            </Button>
          </div>
        )}

        <div className="min-h-[140px] py-2">
          {step === 1 && (
            <div className="space-y-3">
              <Label>Qual é o objetivo da mensagem?</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o objetivo..." />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Label>Qual é o público-alvo?</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o público..." />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Label>Qual canal vai usar?</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as 'email' | 'whatsapp')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <Label>Qual tom pretende?</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          )}
          {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Seguinte
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={!canProceed() || generateTemplate.isPending}>
              {generateTemplate.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> A gerar...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" /> Gerar Template</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
