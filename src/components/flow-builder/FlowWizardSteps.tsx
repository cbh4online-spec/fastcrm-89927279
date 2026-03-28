import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  HeadphonesIcon, UserPlus, HelpCircle, CalendarDays, ShoppingBag, Wrench,
  Info, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type FlowCategory = 'support' | 'onboarding' | 'faq' | 'booking' | 'sales' | 'custom';

interface CategoryOption {
  id: FlowCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  suggestedName: string;
  suggestedChannels: string[];
  suggestedGoal: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    id: 'support',
    label: 'Suporte ao Cliente',
    description: 'Triagem de problemas e encaminhamento',
    icon: HeadphonesIcon,
    suggestedName: 'Suporte ao Cliente',
    suggestedChannels: ['whatsapp', 'widget', 'email'],
    suggestedGoal: 'support'
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    description: 'Boas-vindas e recolha de dados iniciais',
    icon: UserPlus,
    suggestedName: 'Onboarding de Cliente',
    suggestedChannels: ['whatsapp', 'widget'],
    suggestedGoal: 'onboarding'
  },
  {
    id: 'faq',
    label: 'FAQ Interativo',
    description: 'Perguntas frequentes com respostas automáticas',
    icon: HelpCircle,
    suggestedName: 'FAQ Interativo',
    suggestedChannels: ['widget', 'whatsapp'],
    suggestedGoal: 'faq'
  },
  {
    id: 'booking',
    label: 'Agendamento',
    description: 'Recolha de data/hora e confirmação',
    icon: CalendarDays,
    suggestedName: 'Agendamento de Reunião',
    suggestedChannels: ['whatsapp', 'widget', 'email'],
    suggestedGoal: 'appointment'
  },
  {
    id: 'sales',
    label: 'Vendas',
    description: 'Qualificação de leads e recomendação',
    icon: ShoppingBag,
    suggestedName: 'Qualificação de Vendas',
    suggestedChannels: ['whatsapp', 'instagram', 'widget'],
    suggestedGoal: 'lead_capture'
  },
  {
    id: 'custom',
    label: 'Personalizado',
    description: 'Crie o seu próprio fluxo do zero',
    icon: Wrench,
    suggestedName: '',
    suggestedChannels: [],
    suggestedGoal: ''
  }
];

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { id: 'email', label: 'Email', emoji: '📧' },
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'facebook', label: 'Facebook', emoji: '👤' },
  { id: 'sms', label: 'SMS', emoji: '📱' },
  { id: 'widget', label: 'Widget Web', emoji: '🌐' }
];

const STEPS_CONFIG = [
  { label: 'Categoria', number: 1 },
  { label: 'Detalhes', number: 2 },
  { label: 'Configuração', number: 3 },
  { label: 'Canais', number: 4 }
];

export interface WizardResult {
  name: string;
  description?: string;
  goalType?: string;
  personaId?: string;
  knowledgeBaseIds?: string[];
  triggerChannels?: string[];
}

interface FlowWizardStepsProps {
  personas: Array<{ id: string; name: string; isActive: boolean }>;
  knowledgeBases: Array<{ id: string; name: string }>;
  onComplete: (data: WizardResult) => void;
  onCancel: () => void;
}

export function FlowWizardSteps({ personas, knowledgeBases, onComplete, onCancel }: FlowWizardStepsProps) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<FlowCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState('');
  const [personaId, setPersonaId] = useState('');
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const activePersonas = personas.filter(p => p.isActive);

  const handleCategorySelect = (cat: CategoryOption) => {
    setCategory(cat.id);
    if (!name) setName(cat.suggestedName);
    if (!goalType) setGoalType(cat.suggestedGoal);
    if (selectedChannels.length === 0) setSelectedChannels(cat.suggestedChannels);
  };

  const canProceed = () => {
    if (step === 1) return category !== null;
    if (step === 2) return name.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else {
      onComplete({
        name: name.trim(),
        description: description.trim() || undefined,
        goalType: goalType || undefined,
        personaId: personaId || undefined,
        knowledgeBaseIds: selectedKBs.length > 0 ? selectedKBs : undefined,
        triggerChannels: selectedChannels.length > 0 ? selectedChannels : undefined
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {STEPS_CONFIG.map((s, i) => (
          <div key={s.number} className="flex items-center flex-1">
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors shrink-0",
              step > s.number ? "bg-primary text-primary-foreground" :
              step === s.number ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            )}>
              {step > s.number ? <Check className="h-3.5 w-3.5" /> : s.number}
            </div>
            <span className={cn(
              "text-xs ml-1.5 hidden sm:inline",
              step >= s.number ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {s.label}
            </span>
            {i < STEPS_CONFIG.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2 rounded",
                step > s.number ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Category */}
      {step === 1 && (
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-sm">O que quer fazer?</h3>
            <p className="text-xs text-muted-foreground">Escolha o tipo de fluxo que melhor se adapta ao seu objetivo</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center",
                    category === cat.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    category === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{cat.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-sm">Detalhes do fluxo</h3>
            <p className="text-xs text-muted-foreground">Dê um nome e descrição ao seu fluxo</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="wiz-name" className="text-sm">Nome *</Label>
              <Input
                id="wiz-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Qualificação de Leads"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wiz-desc" className="text-sm">Descrição <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea
                id="wiz-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo deste fluxo..."
                rows={2}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Configuration */}
      {step === 3 && (
        <TooltipProvider>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm">Configuração</h3>
              <p className="text-xs text-muted-foreground">Opcional — pode configurar mais tarde</p>
            </div>

            {activePersonas.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-sm">Persona IA</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>A persona define a personalidade e tom das respostas automáticas do fluxo.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select value={personaId || '__none__'} onValueChange={(v) => setPersonaId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma (usa predefinição)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma (usa predefinição)</SelectItem>
                    {activePersonas.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {knowledgeBases.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-sm">Bases de Conhecimento</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Bases de conhecimento contêm documentos e informações que a IA pode consultar para dar respostas mais precisas.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {knowledgeBases.map(kb => (
                    <label key={kb.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md border hover:bg-muted/50">
                      <Checkbox
                        checked={selectedKBs.includes(kb.id)}
                        onCheckedChange={() => setSelectedKBs(prev => 
                          prev.includes(kb.id) ? prev.filter(k => k !== kb.id) : [...prev, kb.id]
                        )}
                      />
                      {kb.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activePersonas.length === 0 && knowledgeBases.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">Nenhuma persona ou base de conhecimento disponível.</p>
                <p className="text-xs mt-1">Pode criá-las depois na tab de Personas e Conhecimento.</p>
              </div>
            )}
          </div>
        </TooltipProvider>
      )}

      {/* Step 4: Channels */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-sm">Canais ativos</h3>
            <p className="text-xs text-muted-foreground">Onde este fluxo estará disponível</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CHANNELS.map(ch => (
              <label
                key={ch.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  selectedChannels.includes(ch.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <Checkbox
                  checked={selectedChannels.includes(ch.id)}
                  onCheckedChange={() => setSelectedChannels(prev =>
                    prev.includes(ch.id) ? prev.filter(c => c !== ch.id) : [...prev, ch.id]
                  )}
                />
                <span className="text-base">{ch.emoji}</span>
                <span className="text-sm font-medium">{ch.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={step === 1 ? onCancel : () => setStep(step - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 1 ? 'Cancelar' : 'Anterior'}
        </Button>
        <Button size="sm" onClick={handleNext} disabled={!canProceed()}>
          {step === 4 ? 'Criar Fluxo' : 'Seguinte'}
          {step < 4 && <ChevronRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}
