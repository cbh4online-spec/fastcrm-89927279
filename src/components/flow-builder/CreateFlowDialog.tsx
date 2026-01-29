import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConversationalFlow, GOAL_TYPE_CONFIG, GoalType } from '@/types/conversational-flows';
import { Checkbox } from '@/components/ui/checkbox';

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

  useEffect(() => {
    if (editingFlow) {
      setName(editingFlow.name);
      setDescription(editingFlow.description || '');
      setGoalType(editingFlow.goalType || '');
      setPersonaId(editingFlow.personaId || '');
      setSelectedKBs(editingFlow.knowledgeBaseIds || []);
      setSelectedChannels(editingFlow.triggerChannels || []);
    } else {
      setName('');
      setDescription('');
      setGoalType('');
      setPersonaId('');
      setSelectedKBs([]);
      setSelectedChannels([]);
    }
  }, [editingFlow, open]);

  const handleSubmit = () => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingFlow ? 'Editar Fluxo' : 'Criar Novo Fluxo'}
          </DialogTitle>
        </DialogHeader>

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
              <Select value={personaId} onValueChange={setPersonaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleciona persona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma (usa predefinição)</SelectItem>
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
              {CHANNELS.map(channel => (
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {editingFlow ? 'Guardar' : 'Criar Fluxo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
