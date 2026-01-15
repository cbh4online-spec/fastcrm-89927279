import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Edit, 
  Sparkles, 
  Save, 
  CheckCircle2,
  Loader2,
  Wand2,
  HelpCircle,
  FileText,
  ClipboardList,
  MessageSquare,
  ExternalLink,
  File,
  Lock,
  Globe,
  AlertCircle
} from 'lucide-react';
import { 
  EntryType, 
  KnowledgeContext,
  ContentVisibility,
  ENTRY_TYPE_CONFIG, 
  CONTEXT_CONFIG
} from '@/types/knowledge-base';
import { cn } from '@/lib/utils';

interface CreateEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBaseId: string;
  onCreateEntry: (data: {
    title: string;
    question?: string;
    content: string;
    entryType: EntryType;
    category?: string;
    context?: KnowledgeContext;
    visibility?: ContentVisibility;
    internalNotes?: string;
    status: 'draft' | 'validated';
  }) => Promise<void>;
  onAIAssist?: (prompt: string, type: 'generate' | 'rewrite' | 'faq' | 'summarize') => Promise<string>;
  isLoading?: boolean;
}

export function CreateEntryDialog({
  open,
  onOpenChange,
  knowledgeBaseId,
  onCreateEntry,
  onAIAssist,
  isLoading
}: CreateEntryDialogProps) {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [entryType, setEntryType] = useState<EntryType>('faq');
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [context, setContext] = useState<KnowledgeContext>('geral');
  const [visibility, setVisibility] = useState<ContentVisibility>('external');
  const [internalNotes, setInternalNotes] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const handleAIGenerate = async (type: 'generate' | 'rewrite' | 'faq' | 'summarize') => {
    if (!onAIAssist || !aiPrompt.trim()) return;
    
    setIsAiProcessing(true);
    try {
      const result = await onAIAssist(aiPrompt, type);
      setContent(result);
    } catch (error) {
      console.error('AI assist error:', error);
    }
    setIsAiProcessing(false);
  };

  const handleSubmit = async (saveAsDraft: boolean) => {
    if (!title.trim() || !content.trim()) return;

    await onCreateEntry({
      title,
      question: entryType === 'faq' ? question : undefined,
      content,
      entryType,
      category: category || undefined,
      context,
      visibility,
      internalNotes: internalNotes || undefined,
      status: saveAsDraft ? 'draft' : 'validated'
    });

    // Reset form
    setTitle('');
    setQuestion('');
    setContent('');
    setCategory('');
    setContext('geral');
    setVisibility('external');
    setInternalNotes('');
    setAiPrompt('');
    onOpenChange(false);
  };

  const entryTypeIcons = {
    faq: HelpCircle,
    article: FileText,
    document: File,
    procedure: ClipboardList,
    script: MessageSquare,
    link: ExternalLink
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Criar Nova Entrada
          </DialogTitle>
          <DialogDescription>
            Adiciona conhecimento que a IA vai usar para responder aos clientes.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'manual' | 'ai')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Criação Manual
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Criar com Ajuda da IA
            </TabsTrigger>
          </TabsList>

          {/* Manual Creation */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            {/* Entry Type Selection */}
            <div>
              <Label className="mb-2 block">Tipo de Entrada</Label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(ENTRY_TYPE_CONFIG).map(([key, config]) => {
                  const Icon = entryTypeIcons[key as EntryType];
                  return (
                    <Button
                      key={key}
                      type="button"
                      variant={entryType === key ? 'default' : 'outline'}
                      className="h-auto py-3 flex flex-col items-center gap-1"
                      onClick={() => setEntryType(key as EntryType)}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs">{config.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label>Título *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Política de devolução, Como usar o produto..."
                className="mt-1"
              />
            </div>

            {/* Question (for FAQ) */}
            {entryType === 'faq' && (
              <div>
                <Label>Pergunta</Label>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ex: Como posso devolver um produto?"
                  className="mt-1"
                />
              </div>
            )}

            {/* Content */}
            <div>
              <Label>Conteúdo / Resposta *</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escreve aqui o conteúdo completo..."
                className="mt-1 min-h-[150px]"
              />
            </div>

            {/* Category & Context */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Devoluções, Pagamentos..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Contexto de Uso</Label>
                <Select value={context} onValueChange={(v) => setContext(v as KnowledgeContext)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTEXT_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <Label className="mb-2 block">Visibilidade</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={visibility === 'external' ? 'default' : 'outline'}
                  className="flex items-center gap-2"
                  onClick={() => setVisibility('external')}
                >
                  <Globe className="h-4 w-4" />
                  Externo (clientes)
                </Button>
                <Button
                  type="button"
                  variant={visibility === 'internal' ? 'default' : 'outline'}
                  className="flex items-center gap-2"
                  onClick={() => setVisibility('internal')}
                >
                  <Lock className="h-4 w-4" />
                  Interno (equipa)
                </Button>
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <Label>Observações Internas (opcional)</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Notas visíveis apenas para a equipa..."
                className="mt-1 min-h-[80px]"
              />
            </div>
          </TabsContent>

          {/* AI Assisted Creation */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Criação Assistida por IA</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    A IA pode ajudar a criar, reescrever ou melhorar conteúdo.
                    <br />
                    <span className="text-primary font-medium">
                      Todo conteúdo gerado é guardado como rascunho para validação.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>Descreve o que precisas</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: Cria uma FAQ sobre a política de devoluções da loja, explicando o prazo de 30 dias e as condições..."
                className="mt-1 min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => handleAIGenerate('generate')}
                disabled={isAiProcessing || !aiPrompt.trim()}
                variant="outline"
              >
                {isAiProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Gerar Texto
              </Button>
              <Button 
                onClick={() => handleAIGenerate('faq')}
                disabled={isAiProcessing || !aiPrompt.trim()}
                variant="outline"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Criar FAQs
              </Button>
              <Button 
                onClick={() => handleAIGenerate('rewrite')}
                disabled={isAiProcessing || !aiPrompt.trim()}
                variant="outline"
              >
                <Edit className="h-4 w-4 mr-2" />
                Reescrever
              </Button>
              <Button 
                onClick={() => handleAIGenerate('summarize')}
                disabled={isAiProcessing || !aiPrompt.trim()}
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Resumir
              </Button>
            </div>

            {content && (
              <div>
                <Label>Resultado da IA</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Podes editar o texto antes de guardar.
                </p>
              </div>
            )}

            {content && (
              <div>
                <Label>Título *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Dá um título a esta entrada..."
                  className="mt-1"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Info Alert */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
          <span className="text-amber-700 dark:text-amber-400">
            Só conteúdos validados são usados pela IA para responder a clientes.
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant="secondary"
            onClick={() => handleSubmit(true)}
            disabled={isLoading || !title.trim() || !content.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Rascunho
          </Button>
          <Button 
            onClick={() => handleSubmit(false)}
            disabled={isLoading || !title.trim() || !content.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Validar e Publicar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
