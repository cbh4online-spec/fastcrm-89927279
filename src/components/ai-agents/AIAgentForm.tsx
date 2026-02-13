import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Phone, 
  Instagram, 
  Facebook, 
  Mail, 
  MessageSquare,
  Headphones,
  X
} from 'lucide-react';
import type { AIChannelAgent, AgentChannel, CreateAIAgentData } from '@/types/aiChannelAgents';
import { AGENT_CHANNELS, getChannelConfig } from '@/types/aiChannelAgents';

interface AIAgentFormProps {
  agent?: AIChannelAgent | null;
  personas: Array<{ id: string; name: string; toneOfVoice: string }>;
  knowledgeBases: Array<{ id: string; name: string }>;
  flows: Array<{ id: string; name: string }>;
  onSubmit: (data: CreateAIAgentData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const channelIcons: Record<AgentChannel, React.ReactNode> = {
  widget: <MessageCircle className="h-4 w-4" />,
  whatsapp: <Phone className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  live_chat: <Headphones className="h-4 w-4" />,
};

export function AIAgentForm({
  agent,
  personas,
  knowledgeBases,
  flows,
  onSubmit,
  onCancel,
  isLoading = false,
}: AIAgentFormProps) {
  const isEditing = !!agent;

  // Form state
  const [name, setName] = useState(agent?.name || '');
  const [description, setDescription] = useState(agent?.description || '');
  const [channel, setChannel] = useState<AgentChannel>(agent?.channel || 'widget');
  const [personaId, setPersonaId] = useState<string>(agent?.personaId || '');
  const [selectedKBs, setSelectedKBs] = useState<string[]>(agent?.knowledgeBaseIds || []);
  const [flowId, setFlowId] = useState<string>(agent?.flowId || '');
  const [isActive, setIsActive] = useState(agent?.isActive ?? true);

  // Update state when agent changes
  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description || '');
      setChannel(agent.channel);
      setPersonaId(agent.personaId || '');
      setSelectedKBs(agent.knowledgeBaseIds || []);
      setFlowId(agent.flowId || '');
      setIsActive(agent.isActive);
    }
  }, [agent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      channel,
      personaId: personaId || undefined,
      knowledgeBaseIds: selectedKBs,
      flowId: flowId || undefined,
      isActive,
    });
  };

  const toggleKB = (kbId: string) => {
    if (selectedKBs.includes(kbId)) {
      setSelectedKBs(prev => prev.filter(id => id !== kbId));
    } else if (selectedKBs.length < 7) {
      setSelectedKBs(prev => [...prev, kbId]);
    }
  };

  const moveKB = (kbId: string, direction: "up" | "down") => {
    const idx = selectedKBs.indexOf(kbId);
    if (idx === -1) return;
    const newArr = [...selectedKBs];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newArr.length) return;
    [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
    setSelectedKBs(newArr);
  };

  const removeKB = (kbId: string) => {
    setSelectedKBs(prev => prev.filter(id => id !== kbId));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Channel Selection */}
      <div className="space-y-2">
        <Label>Canal *</Label>
        <Select value={channel} onValueChange={(v) => setChannel(v as AgentChannel)} disabled={isEditing}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar canal" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(AGENT_CHANNELS).map(ch => (
              <SelectItem key={ch.id} value={ch.id}>
                <div className="flex items-center gap-2">
                  <span className={ch.color}>{channelIcons[ch.id]}</span>
                  <span>{ch.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {getChannelConfig(channel).description}
        </p>
      </div>

      {/* Agent Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Agente *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Ex: Bot ${getChannelConfig(channel).label} Vendas`}
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição breve do propósito deste agente..."
          rows={2}
        />
      </div>

      {/* Persona Selection */}
      <div className="space-y-2">
        <Label>Persona IA</Label>
        <Select value={personaId || "_none"} onValueChange={(v) => setPersonaId(v === "_none" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar persona (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Nenhuma persona</SelectItem>
            {personas.map(persona => (
              <SelectItem key={persona.id} value={persona.id}>
                <div className="flex items-center gap-2">
                  <span>{persona.name}</span>
                  <span className="text-xs text-muted-foreground">({persona.toneOfVoice})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          A persona define o tom e comportamento das respostas
        </p>
      </div>

      {/* Knowledge Bases Multi-select */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Bases de Conhecimento</Label>
          <span className="text-xs text-muted-foreground">{selectedKBs.length}/7</span>
        </div>
        
        {/* Selected KBs with priority order */}
        {selectedKBs.length > 0 && (
          <div className="space-y-1 mb-2 p-2 border rounded-md bg-muted/30">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Ordem de prioridade</span>
            {selectedKBs.map((kbId, idx) => {
              const kb = knowledgeBases.find(k => k.id === kbId);
              return kb ? (
                <div key={kbId} className="flex items-center justify-between gap-1 py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-4">{idx + 1}.</span>
                    <span className="text-xs">{kb.name}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => moveKB(kbId, "up")} disabled={idx === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <span className="text-[10px]">▲</span>
                    </button>
                    <button type="button" onClick={() => moveKB(kbId, "down")} disabled={idx === selectedKBs.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <span className="text-[10px]">▼</span>
                    </button>
                    <button type="button" onClick={() => removeKB(kbId)} className="p-0.5 text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        )}
        
        {/* KB Checkboxes */}
        <ScrollArea className="h-32 border rounded-md p-2">
          {knowledgeBases.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhuma base de conhecimento disponível
            </p>
          ) : (
            <div className="space-y-2">
              {knowledgeBases.map(kb => (
                <div key={kb.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`kb-${kb.id}`}
                    checked={selectedKBs.includes(kb.id)}
                    onCheckedChange={() => toggleKB(kb.id)}
                    disabled={!selectedKBs.includes(kb.id) && selectedKBs.length >= 7}
                  />
                  <label htmlFor={`kb-${kb.id}`} className="text-sm cursor-pointer">
                    {kb.name}
                  </label>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <p className="text-xs text-muted-foreground">
          Selecione até 7 bases de conhecimento. A ordem define a prioridade de consulta.
        </p>
      </div>

      {/* Flow Selection */}
      <div className="space-y-2">
        <Label>Fluxo Conversacional</Label>
        <Select value={flowId || "_none"} onValueChange={(v) => setFlowId(v === "_none" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar fluxo (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Nenhum fluxo</SelectItem>
            {flows.map(flow => (
              <SelectItem key={flow.id} value={flow.id}>
                {flow.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Um fluxo estruturado para guiar a conversa
        </p>
      </div>

      {/* Active Status */}
      <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
        <div>
          <Label htmlFor="is-active" className="cursor-pointer">Agente Ativo</Label>
          <p className="text-xs text-muted-foreground">
            Desative para pausar este agente sem o eliminar
          </p>
        </div>
        <Switch
          id="is-active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!name.trim() || isLoading}>
          {isLoading ? 'A guardar...' : isEditing ? 'Guardar Alterações' : 'Criar Agente'}
        </Button>
      </div>
    </form>
  );
}
