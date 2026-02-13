/**
 * BotSetupWizard - 5-step guided wizard to create a complete AI agent
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Bot, ChevronLeft, ChevronRight, Check, BookOpen,
  ArrowUpDown, UserCheck, CalendarDays, MailCheck, Sparkles
} from 'lucide-react';
import { AGENT_CHANNELS, type AgentChannel } from '@/types/aiChannelAgents';

interface BotSetupWizardProps {
  personas: Array<{ id: string; name: string }>;
  knowledgeBases: Array<{ id: string; name: string }>;
  onComplete: (config: WizardConfig) => void;
  onCancel: () => void;
}

interface WizardConfig {
  name: string;
  channel: AgentChannel;
  personaId: string | null;
  description: string;
  knowledgeBaseIds: string[];
  handoverEnabled: boolean;
  handoverMaxRetries: number;
  handoverClosingMessage: string;
  bookingEnabled: boolean;
  followupEnabled: boolean;
  followupDelays: number[];
  isActive: boolean;
}

const STEPS = ['Info', 'Conhecimento', 'Objectivos', 'Automações', 'Revisão'];

export function BotSetupWizard({ personas, knowledgeBases, onComplete, onCancel }: BotSetupWizardProps) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<WizardConfig>({
    name: '',
    channel: 'whatsapp',
    personaId: null,
    description: '',
    knowledgeBaseIds: [],
    handoverEnabled: true,
    handoverMaxRetries: 2,
    handoverClosingMessage: 'Vou transferir para um colega. Obrigado!',
    bookingEnabled: false,
    followupEnabled: false,
    followupDelays: [60, 360, 1440],
    isActive: true,
  });

  const progress = ((step + 1) / STEPS.length) * 100;
  const canProceed = step === 0 ? config.name.trim().length > 0 : true;

  const updateConfig = (partial: Partial<WizardConfig>) => setConfig(prev => ({ ...prev, ...partial }));

  const toggleKB = (kbId: string) => {
    setConfig(prev => {
      const ids = prev.knowledgeBaseIds.includes(kbId)
        ? prev.knowledgeBaseIds.filter(id => id !== kbId)
        : prev.knowledgeBaseIds.length < 7
          ? [...prev.knowledgeBaseIds, kbId]
          : prev.knowledgeBaseIds;
      return { ...prev, knowledgeBaseIds: ids };
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Assistente de Criação</CardTitle>
            <CardDescription className="text-xs">Passo {step + 1} de {STEPS.length} — {STEPS[step]}</CardDescription>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-[10px] ${i <= step ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{s}</span>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 min-h-[300px]">
        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do agente</Label>
              <Input value={config.name} onChange={(e) => updateConfig({ name: e.target.value })} placeholder="Ex: Assistente de Vendas" />
            </div>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={config.channel} onValueChange={(v) => updateConfig({ channel: v as AgentChannel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AGENT_CHANNELS).map(([key, ch]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Bot className={`h-3.5 w-3.5 ${ch.color}`} />
                        {ch.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Persona</Label>
              <Select value={config.personaId || ''} onValueChange={(v) => updateConfig({ personaId: v || null })}>
                <SelectTrigger><SelectValue placeholder="Selecionar persona..." /></SelectTrigger>
                <SelectContent>
                  {personas.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={config.description} onChange={(e) => updateConfig({ description: e.target.value })} placeholder="O que este agente faz..." rows={2} />
            </div>
          </div>
        )}

        {/* Step 1: Knowledge Bases */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Bases de Conhecimento</Label>
              <Badge variant="outline">{config.knowledgeBaseIds.length}/7</Badge>
            </div>
            {knowledgeBases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma base de conhecimento disponível. Crie uma primeiro.</p>
            ) : (
              <div className="grid gap-2">
                {knowledgeBases.map((kb, i) => {
                  const selected = config.knowledgeBaseIds.includes(kb.id);
                  const idx = config.knowledgeBaseIds.indexOf(kb.id);
                  return (
                    <button
                      key={kb.id}
                      onClick={() => toggleKB(kb.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-sm">{kb.name}</span>
                      </div>
                      {selected && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">#{idx + 1}</Badge>
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Goals */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Handover */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <Label>Handover automático</Label>
                </div>
                <Switch checked={config.handoverEnabled} onCheckedChange={(v) => updateConfig({ handoverEnabled: v })} />
              </div>
              {config.handoverEnabled && (
                <div className="pl-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Max tentativas</span>
                    <Badge variant="secondary">{config.handoverMaxRetries}</Badge>
                  </div>
                  <Slider value={[config.handoverMaxRetries]} onValueChange={([v]) => updateConfig({ handoverMaxRetries: v })} min={1} max={5} step={1} />
                </div>
              )}
            </div>

            {/* Booking */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Label>Agendamento</Label>
              </div>
              <Switch checked={config.bookingEnabled} onCheckedChange={(v) => updateConfig({ bookingEnabled: v })} />
            </div>

            {/* Follow-up */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MailCheck className="h-4 w-4 text-muted-foreground" />
                  <Label>Follow-up automático</Label>
                </div>
                <Switch checked={config.followupEnabled} onCheckedChange={(v) => updateConfig({ followupEnabled: v })} />
              </div>
              {config.followupEnabled && (
                <p className="text-xs text-muted-foreground pl-6">
                  Cadência padrão: 1h → 6h → 24h. Personalize depois na configuração do agente.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Automations placeholder */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <ArrowUpDown className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium">Workflows & Transferências</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Pode configurar workflow triggers e regras de transferência depois de criar o agente, 
                no painel "Objectivos & Regras" do card do agente.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Nome</span>
                <p className="font-medium">{config.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Canal</span>
                <p className="font-medium">{AGENT_CHANNELS[config.channel]?.label}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Persona</span>
                <p className="font-medium">{personas.find(p => p.id === config.personaId)?.name || 'Nenhuma'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">KBs</span>
                <p className="font-medium">{config.knowledgeBaseIds.length} base(s)</p>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <UserCheck className="h-3.5 w-3.5" />
                <span>Handover: {config.handoverEnabled ? `Ativo (max ${config.handoverMaxRetries} tentativas)` : 'Inativo'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Agendamento: {config.bookingEnabled ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MailCheck className="h-3.5 w-3.5" />
                <span>Follow-up: {config.followupEnabled ? 'Ativo' : 'Inativo'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label>Ativar imediatamente</Label>
              <Switch checked={config.isActive} onCheckedChange={(v) => updateConfig({ isActive: v })} />
            </div>
          </div>
        )}
      </CardContent>

      {/* Navigation */}
      <div className="flex items-center justify-between p-6 pt-0">
        <Button variant="ghost" onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 0 ? 'Cancelar' : 'Anterior'}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed}>
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => onComplete(config)} className="gap-2">
            <Check className="h-4 w-4" />
            {config.isActive ? 'Criar & Ativar' : 'Criar Inativo'}
          </Button>
        )}
      </div>
    </Card>
  );
}
