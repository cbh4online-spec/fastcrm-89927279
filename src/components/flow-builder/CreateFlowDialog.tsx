import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ConversationalFlow } from '@/types/conversational-flows';
import { FLOW_TEMPLATES, TemplateCard, FlowTemplate } from './FlowTemplates';
import { FlowWizardSteps, WizardResult } from './FlowWizardSteps';
import { GenerateFlowAI } from './GenerateFlowAI';
import { Wand2, LayoutTemplate, Sparkles, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DialogFooter } from '@/components/ui/dialog';

// --- Edit form (reused for editing existing flows) ---
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { GOAL_TYPE_CONFIG } from '@/types/conversational-flows';

type CreationMode = 'choose' | 'wizard' | 'template' | 'ai';

interface CreateFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    goalType?: string;
    personaId?: string;
    knowledgeBaseIds?: string[];
    triggerChannels?: string[];
  }) => void;
  onSubmitTemplate?: (template: FlowTemplate) => void;
  personas: Array<{ id: string; name: string; isActive: boolean }>;
  knowledgeBases: Array<{ id: string; name: string }>;
  editingFlow?: ConversationalFlow | null;
}

export function CreateFlowDialog({
  open,
  onOpenChange,
  onSubmit,
  onSubmitTemplate,
  personas,
  knowledgeBases,
  editingFlow
}: CreateFlowDialogProps) {
  const [mode, setMode] = useState<CreationMode>('choose');
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);

  // Edit form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState('');
  const [personaId, setPersonaId] = useState('');
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  useEffect(() => {
    if (editingFlow) {
      setName(editingFlow.name);
      setDescription(editingFlow.description || '');
      setGoalType(editingFlow.goalType || '');
      setPersonaId(editingFlow.personaId || '');
      setSelectedKBs(editingFlow.knowledgeBaseIds || []);
      setSelectedChannels(editingFlow.triggerChannels || []);
    } else {
      setMode('choose');
      setSelectedTemplate(null);
      setName('');
      setDescription('');
      setGoalType('');
      setPersonaId('');
      setSelectedKBs([]);
      setSelectedChannels([]);
    }
  }, [editingFlow, open]);

  const handleWizardComplete = (data: WizardResult) => {
    onSubmit(data);
  };

  const handleAIComplete = (data: WizardResult) => {
    onSubmit(data);
  };

  const handleTemplateConfirm = () => {
    if (selectedTemplate && onSubmitTemplate) {
      onSubmitTemplate(selectedTemplate);
    }
  };

  const handleEditSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      goalType: goalType || undefined,
      personaId: personaId || undefined,
      knowledgeBaseIds: selectedKBs.length > 0 ? selectedKBs : undefined,
      triggerChannels: selectedChannels.length > 0 ? selectedChannels : undefined
    });
  };

  const activePersonas = personas.filter(p => p.isActive);

  // Editing mode — show simple form
  if (editingFlow) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Fluxo</DialogTitle>
          </DialogHeader>
          <EditFlowForm
            name={name} setName={setName}
            description={description} setDescription={setDescription}
            goalType={goalType} setGoalType={setGoalType}
            personaId={personaId} setPersonaId={setPersonaId}
            selectedKBs={selectedKBs} setSelectedKBs={setSelectedKBs}
            selectedChannels={selectedChannels} setSelectedChannels={setSelectedChannels}
            activePersonas={activePersonas}
            knowledgeBases={knowledgeBases}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleEditSubmit} disabled={!name.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Fluxo</DialogTitle>
        </DialogHeader>

        {/* Mode chooser */}
        {mode === 'choose' && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Como pretende criar o seu fluxo?</p>
            <div className="space-y-2">
              <ModeCard
                icon={Wand2}
                title="Assistente Guiado"
                description="Responda algumas perguntas simples e criamos o fluxo por si"
                onClick={() => setMode('wizard')}
              />
              <ModeCard
                icon={LayoutTemplate}
                title="Usar Template"
                description="Comece com um modelo pronto e personalize depois"
                onClick={() => setMode('template')}
              />
              <ModeCard
                icon={Sparkles}
                title="Descrever com IA"
                description="Diga o que precisa em linguagem natural e a IA cria por si"
                onClick={() => setMode('ai')}
              />
            </div>
          </div>
        )}

        {/* Wizard mode */}
        {mode === 'wizard' && (
          <FlowWizardSteps
            personas={personas}
            knowledgeBases={knowledgeBases}
            onComplete={handleWizardComplete}
            onCancel={() => setMode('choose')}
          />
        )}

        {/* Template mode */}
        {mode === 'template' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setMode('choose'); setSelectedTemplate(null); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h3 className="font-medium text-sm">Escolher Template</h3>
                <p className="text-xs text-muted-foreground">Selecione um modelo pré-configurado</p>
              </div>
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {FLOW_TEMPLATES.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={setSelectedTemplate}
                  isSelected={selectedTemplate?.id === template.id}
                />
              ))}
            </div>
            {selectedTemplate && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-1">O que será criado:</p>
                <ul className="text-muted-foreground space-y-0.5 text-xs">
                  <li>• {selectedTemplate.steps.length} passos configurados</li>
                  <li>• {selectedTemplate.variables.length} variáveis de recolha</li>
                  <li>• Canais: {selectedTemplate.defaultChannels.join(', ')}</li>
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setMode('choose'); setSelectedTemplate(null); }}>Voltar</Button>
              <Button onClick={handleTemplateConfirm} disabled={!selectedTemplate}>Criar a partir do Template</Button>
            </DialogFooter>
          </div>
        )}

        {/* AI mode */}
        {mode === 'ai' && (
          <GenerateFlowAI
            onComplete={handleAIComplete}
            onCancel={() => setMode('choose')}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Mode selection card
function ModeCard({ icon: Icon, title, description, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
    >
      <div className="p-2.5 rounded-lg bg-muted text-muted-foreground shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}

// Edit form for existing flows
function EditFlowForm({ name, setName, description, setDescription, goalType, setGoalType, personaId, setPersonaId, selectedKBs, setSelectedKBs, selectedChannels, setSelectedChannels, activePersonas, knowledgeBases }: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  goalType: string; setGoalType: (v: string) => void;
  personaId: string; setPersonaId: (v: string) => void;
  selectedKBs: string[]; setSelectedKBs: (v: string[]) => void;
  selectedChannels: string[]; setSelectedChannels: (v: string[]) => void;
  activePersonas: Array<{ id: string; name: string }>;
  knowledgeBases: Array<{ id: string; name: string }>;
}) {
  const CHANNELS = [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'email', label: 'Email' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'sms', label: 'SMS' },
    { id: 'widget', label: 'Widget Web' }
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Qualificação de Leads" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreve o objetivo deste fluxo..." rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Objetivo do Fluxo</Label>
        <Select value={goalType} onValueChange={setGoalType}>
          <SelectTrigger><SelectValue placeholder="Seleciona o objetivo..." /></SelectTrigger>
          <SelectContent>
            {Object.entries(GOAL_TYPE_CONFIG).map(([type, config]) => (
              <SelectItem key={type} value={type}>{config.label} - {config.description}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {activePersonas.length > 0 && (
        <div className="space-y-2">
          <Label>Persona IA</Label>
          <Select value={personaId || '__none__'} onValueChange={(val) => setPersonaId(val === '__none__' ? '' : val)}>
            <SelectTrigger><SelectValue placeholder="Seleciona persona..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhuma (usa predefinição)</SelectItem>
              {activePersonas.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}
      {knowledgeBases.length > 0 && (
        <div className="space-y-2">
          <Label>Bases de Conhecimento</Label>
          <div className="grid grid-cols-2 gap-2">
            {knowledgeBases.map(kb => (
              <label key={kb.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selectedKBs.includes(kb.id)} onCheckedChange={() => setSelectedKBs(selectedKBs.includes(kb.id) ? selectedKBs.filter(k => k !== kb.id) : [...selectedKBs, kb.id])} />
                {kb.name}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label>Canais Ativos</Label>
        <div className="grid grid-cols-3 gap-2">
          {CHANNELS.map(channel => (
            <label key={channel.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={selectedChannels.includes(channel.id)} onCheckedChange={() => setSelectedChannels(selectedChannels.includes(channel.id) ? selectedChannels.filter(c => c !== channel.id) : [...selectedChannels, channel.id])} />
              {channel.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
