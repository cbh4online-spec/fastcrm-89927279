import { useState } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { KnowledgeBaseList } from './KnowledgeBaseList';
import { PersonaList } from './PersonaList';
import { AddSourcePanel } from './AddSourcePanel';
import { AIQueryPanel } from './AIQueryPanel';
import { KnowledgeMetricsCard } from './KnowledgeMetricsCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  RefreshCw, 
  Brain,
  Plus
} from 'lucide-react';
import { KNOWLEDGE_BASE_TYPES, PERSONA_TYPES, TONE_OPTIONS } from '@/types/knowledge-base';
import { toast } from 'sonner';

export function KnowledgeBaseModule() {
  const {
    knowledgeBases,
    personas,
    metrics,
    isLoading,
    createKnowledgeBase,
    addSource,
    createEntry,
    createPersona,
    queryKnowledge,
    refresh
  } = useKnowledgeBase();

  const [selectedKB, setSelectedKB] = useState<string | null>(null);
  const [showCreateKB, setShowCreateKB] = useState(false);
  const [showCreatePersona, setShowCreatePersona] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Create KB form state
  const [kbName, setKbName] = useState('');
  const [kbDescription, setKbDescription] = useState('');
  const [kbType, setKbType] = useState('general');

  // Create Persona form state
  const [personaName, setPersonaName] = useState('');
  const [personaDescription, setPersonaDescription] = useState('');
  const [personaType, setPersonaType] = useState('atendimento');
  const [personaTone, setPersonaTone] = useState('empático');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
    toast.success('Dados atualizados');
  };

  const handleCreateKB = async () => {
    if (!kbName.trim()) return;
    
    await createKnowledgeBase({
      name: kbName,
      description: kbDescription,
      type: kbType as any
    });

    setShowCreateKB(false);
    setKbName('');
    setKbDescription('');
    setKbType('general');
  };

  const handleCreatePersona = async () => {
    if (!personaName.trim()) return;
    
    const typeConfig = PERSONA_TYPES[personaType as keyof typeof PERSONA_TYPES];
    
    await createPersona({
      name: personaName,
      description: personaDescription,
      personaType: personaType as any,
      toneOfVoice: personaTone as any,
      systemPrompt: typeConfig?.defaultPrompt
    });

    setShowCreatePersona(false);
    setPersonaName('');
    setPersonaDescription('');
    setPersonaType('atendimento');
    setPersonaTone('empático');
  };

  const handleAddUrl = async (url: string) => {
    if (!selectedKB) {
      toast.error('Seleciona uma base de conhecimento primeiro');
      return;
    }
    setIsProcessing(true);
    await addSource(selectedKB, 'url', { url });
    setIsProcessing(false);
  };

  const handleAddManual = async (data: { title: string; question?: string; content: string }) => {
    if (!selectedKB) {
      toast.error('Seleciona uma base de conhecimento primeiro');
      return;
    }
    setIsProcessing(true);
    await createEntry(selectedKB, {
      title: data.title,
      question: data.question,
      content: data.content,
      entryType: data.question ? 'faq' : 'content'
    });
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Bases de Conhecimento & IA Especialista
          </h1>
          <p className="text-muted-foreground">
            Transforme a IA num verdadeiro especialista do seu negócio
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Metrics */}
      <KnowledgeMetricsCard metrics={metrics} isLoading={isLoading} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Knowledge Bases */}
        <div className="lg:col-span-1">
          <KnowledgeBaseList 
            knowledgeBases={knowledgeBases}
            isLoading={isLoading}
            onSelect={(kb) => setSelectedKB(kb.id)}
            onCreateNew={() => setShowCreateKB(true)}
          />
        </div>

        {/* Add Source & Test */}
        <div className="lg:col-span-2 space-y-6">
          {selectedKB ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AddSourcePanel 
                onAddUrl={handleAddUrl}
                onAddManual={handleAddManual}
                isProcessing={isProcessing}
              />
              <AIQueryPanel 
                personas={personas}
                onQuery={queryKnowledge}
                context="test"
              />
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="font-medium text-muted-foreground">
                Seleciona uma base de conhecimento
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Ou cria uma nova para começar
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setShowCreateKB(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Criar Base
              </Button>
            </div>
          )}

          {/* Personas */}
          <PersonaList 
            personas={personas}
            isLoading={isLoading}
            onCreateNew={() => setShowCreatePersona(true)}
          />
        </div>
      </div>

      {/* Create KB Dialog */}
      <Dialog open={showCreateKB} onOpenChange={setShowCreateKB}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Base de Conhecimento</DialogTitle>
            <DialogDescription>
              Cria uma base para organizar informação que a IA pode usar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={kbName}
                onChange={(e) => setKbName(e.target.value)}
                placeholder="Ex: FAQ Geral, Scripts de Vendas..."
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={kbDescription}
                onChange={(e) => setKbDescription(e.target.value)}
                placeholder="Para que serve esta base..."
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={kbType} onValueChange={setKbType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KNOWLEDGE_BASE_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateKB} className="w-full" disabled={!kbName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Criar Base
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Persona Dialog */}
      <Dialog open={showCreatePersona} onOpenChange={setShowCreatePersona}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Persona IA</DialogTitle>
            <DialogDescription>
              Define como a IA deve comunicar em cada contexto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="Ex: Consultor de Vendas, Suporte Técnico..."
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={personaDescription}
                onChange={(e) => setPersonaDescription(e.target.value)}
                placeholder="Quando usar esta persona..."
              />
            </div>
            <div>
              <Label>Tipo de Persona</Label>
              <Select value={personaType} onValueChange={setPersonaType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERSONA_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tom de Voz</Label>
              <Select value={personaTone} onValueChange={setPersonaTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TONE_OPTIONS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreatePersona} className="w-full" disabled={!personaName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Criar Persona
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
