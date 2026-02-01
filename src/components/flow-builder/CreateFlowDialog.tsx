import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConversationalFlow, GOAL_TYPE_CONFIG, GoalType } from '@/types/conversational-flows';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FLOW_TEMPLATES, TemplateCard, FlowTemplate } from './FlowTemplates';
import { FileText, Sparkles } from 'lucide-react';

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

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Email' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'sms', label: 'SMS' },
  { id: 'widget', label: 'Widget Web' }
];

export function CreateFlowDialog({
  open,
  onOpenChange,
  onSubmit,
  onSubmitTemplate,
  personas,
  knowledgeBases,
  editingFlow
}: CreateFlowDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState<string>('');
  const [personaId, setPersonaId] = useState<string>('');
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('blank');
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);

  useEffect(() => {
    if (editingFlow) {
      setName(editingFlow.name);
      setDescription(editingFlow.description || '');
      setGoalType(editingFlow.goalType || '');
      setPersonaId(editingFlow.personaId || '');
      setSelectedKBs(editingFlow.knowledgeBaseIds || []);
      setSelectedChannels(editingFlow.triggerChannels || []);
      setActiveTab('blank');
      setSelectedTemplate(null);
    } else {
      setName('');
      setDescription('');
      setGoalType('');
      setPersonaId('');
      setSelectedKBs([]);
      setSelectedChannels([]);
      setActiveTab('blank');
      setSelectedTemplate(null);
    }
  }, [editingFlow, open]);

  const handleSubmit = () => {
    if (activeTab === 'template' && selectedTemplate && onSubmitTemplate) {
      onSubmitTemplate(selectedTemplate);
      return;
    }

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

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(c => c !== channelId)
        : [...prev, channelId]
    );
  };

  const toggleKB = (kbId: string) => {
    setSelectedKBs(prev => 
      prev.includes(kbId)
        ? prev.filter(k => k !== kbId)
        : [...prev, kbId]
    );
  };

  const activePersonas = personas.filter(p => p.isActive);

  const canSubmit = activeTab === 'template' 
    ? selectedTemplate !== null 
    : name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingFlow ? 'Editar Fluxo' : 'Criar Novo Fluxo'}
          </DialogTitle>
        </DialogHeader>

        {!editingFlow && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="blank" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Fluxo Vazio
              </TabsTrigger>
              <TabsTrigger value="template" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Usar Template
              </TabsTrigger>
            </TabsList>

            <TabsContent value="template" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Seleciona um template pré-configurado para começar rapidamente:
              </p>
              <div className="space-y-3">
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
                  <ul className="text-muted-foreground space-y-1">
                    <li>• {selectedTemplate.steps.length} passos configurados</li>
                    <li>• {selectedTemplate.variables.length} variáveis de recolha</li>
                    <li>• Canais: {selectedTemplate.defaultChannels.join(', ')}</li>
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="blank" className="mt-4">
              <BlankFlowForm
                name={name}
                setName={setName}
                description={description}
                setDescription={setDescription}
                goalType={goalType}
                setGoalType={setGoalType}
                personaId={personaId}
                setPersonaId={setPersonaId}
                selectedKBs={selectedKBs}
                toggleKB={toggleKB}
                selectedChannels={selectedChannels}
                toggleChannel={toggleChannel}
                activePersonas={activePersonas}
                knowledgeBases={knowledgeBases}
              />
            </TabsContent>
          </Tabs>
        )}

        {editingFlow && (
          <BlankFlowForm
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            goalType={goalType}
            setGoalType={setGoalType}
            personaId={personaId}
            setPersonaId={setPersonaId}
            selectedKBs={selectedKBs}
            toggleKB={toggleKB}
            selectedChannels={selectedChannels}
            toggleChannel={toggleChannel}
            activePersonas={activePersonas}
            knowledgeBases={knowledgeBases}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {editingFlow 
              ? 'Guardar' 
              : activeTab === 'template' 
                ? 'Criar a partir do Template' 
                : 'Criar Fluxo'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Extracted form component for blank flow creation
interface BlankFlowFormProps {
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  goalType: string;
  setGoalType: (value: string) => void;
  personaId: string;
  setPersonaId: (value: string) => void;
  selectedKBs: string[];
  toggleKB: (id: string) => void;
  selectedChannels: string[];
  toggleChannel: (id: string) => void;
  activePersonas: Array<{ id: string; name: string }>;
  knowledgeBases: Array<{ id: string; name: string }>;
}

function BlankFlowForm({
  name,
  setName,
  description,
  setDescription,
  goalType,
  setGoalType,
  personaId,
  setPersonaId,
  selectedKBs,
  toggleKB,
  selectedChannels,
  toggleChannel,
  activePersonas,
  knowledgeBases
}: BlankFlowFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Qualificação de Leads"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreve o objetivo deste fluxo..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Objetivo do Fluxo</Label>
        <Select value={goalType} onValueChange={setGoalType}>
          <SelectTrigger>
            <SelectValue placeholder="Seleciona o objetivo..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(GOAL_TYPE_CONFIG).map(([type, config]) => (
              <SelectItem key={type} value={type}>
                {config.label} - {config.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activePersonas.length > 0 && (
        <div className="space-y-2">
          <Label>Persona IA</Label>
          <Select 
            value={personaId || '__none__'} 
            onValueChange={(val) => setPersonaId(val === '__none__' ? '' : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleciona persona..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhuma (usa predefinição)</SelectItem>
              {activePersonas.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
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
                <Checkbox
                  checked={selectedKBs.includes(kb.id)}
                  onCheckedChange={() => toggleKB(kb.id)}
                />
                {kb.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Canais Ativos</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'whatsapp', label: 'WhatsApp' },
            { id: 'email', label: 'Email' },
            { id: 'instagram', label: 'Instagram' },
            { id: 'facebook', label: 'Facebook' },
            { id: 'sms', label: 'SMS' },
            { id: 'widget', label: 'Widget Web' }
          ].map(channel => (
            <label key={channel.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={selectedChannels.includes(channel.id)}
                onCheckedChange={() => toggleChannel(channel.id)}
              />
              {channel.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
