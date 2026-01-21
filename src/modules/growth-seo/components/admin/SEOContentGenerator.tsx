import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Save, Eye, Copy, Check } from 'lucide-react';
import { useGenerateSEOContent } from '../../hooks/useGenerateSEOContent';
import { ContentSections } from '../../components/shared/ContentSections';
import { FAQSection } from '../../components/pages/shared/FAQSection';
import type { EntityType, Intent } from '../../types';
import { toast } from 'sonner';

interface GeneratedContent {
  title: string;
  meta_description: string;
  h1: string;
  tldr: string;
  sections: Array<{ id: string; heading: string; content: string; type: "text" | "list" | "steps"; items?: string[] }>;
  faqs: Array<{ question: string; answer: string }>;
  cta: { type: string; text: string; url: string };
  schema_markup: Record<string, unknown>;
}

const entityTypes: { value: EntityType; label: string }[] = [
  { value: 'keyword', label: 'Keyword' },
  { value: 'template', label: 'Template' },
  { value: 'category', label: 'Categoria' },
  { value: 'tool', label: 'Ferramenta' },
  { value: 'glossary', label: 'Glossário' },
  { value: 'guide', label: 'Guia' },
  { value: 'blog', label: 'Blog' },
];

const intents: { value: Intent; label: string }[] = [
  { value: 'informational', label: 'Informativo' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'transactional', label: 'Transacional' },
];

export function SEOContentGenerator() {
  const [entityType, setEntityType] = useState<EntityType>('keyword');
  const [topic, setTopic] = useState('');
  const [intent, setIntent] = useState<Intent>('informational');
  const [language, setLanguage] = useState('pt');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [metadata, setMetadata] = useState<{ slug: string; entity_type: EntityType; intent: Intent; language: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const { generateContent, saveGeneratedContent, isGenerating, error } = useGenerateSEOContent();
  const { currentWorkspace } = useWorkspace();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Por favor, insira um tópico');
      return;
    }

    const result = await generateContent({
      entity_type: entityType,
      topic: topic.trim(),
      intent,
      language,
      additional_context: additionalContext.trim() || undefined,
    });

    if (result?.success && result.content) {
      setGeneratedContent(result.content);
      setMetadata(result.metadata || null);
      toast.success('Conteúdo gerado com sucesso!');
    } else {
      toast.error(result?.error || 'Erro ao gerar conteúdo');
    }
  };

  const handleSave = async () => {
    if (!generatedContent || !metadata || !currentWorkspace?.id) {
      toast.error('Workspace não selecionado');
      return;
    }

    const saved = await saveGeneratedContent(generatedContent, metadata, currentWorkspace.id);
    
    if (saved) {
      toast.success('Conteúdo guardado como rascunho!');
      // Reset form
      setTopic('');
      setAdditionalContext('');
      setGeneratedContent(null);
      setMetadata(null);
    } else {
      toast.error('Erro ao guardar conteúdo');
    }
  };

  const handleCopyJSON = () => {
    if (!generatedContent) return;
    
    navigator.clipboard.writeText(JSON.stringify(generatedContent, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('JSON copiado para a área de transferência');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerador de Conteúdo SEO
          </CardTitle>
          <CardDescription>
            Use IA para gerar conteúdo otimizado para SEO automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entity-type">Tipo de Entidade</Label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intent">Intenção de Busca</Label>
              <Select value={intent} onValueChange={(v) => setIntent(v as Intent)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intents.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Tópico / Keyword Principal</Label>
            <Input
              id="topic"
              placeholder="Ex: CRM para pequenas empresas"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Contexto Adicional (opcional)</Label>
            <Textarea
              id="context"
              placeholder="Informações adicionais para personalizar o conteúdo..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !topic.trim()}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A gerar...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Conteúdo
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Content Preview */}
      {generatedContent && metadata && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Conteúdo Gerado</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{metadata.slug}</Badge>
                  <Badge variant="secondary">{metadata.entity_type}</Badge>
                  <Badge>{metadata.intent}</Badge>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyJSON}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  Guardar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="meta">
              <TabsList>
                <TabsTrigger value="meta">Meta</TabsTrigger>
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
                <TabsTrigger value="faqs">FAQs</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="meta" className="space-y-4 pt-4">
                <div className="grid gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Title ({generatedContent.title.length}/60)</Label>
                    <p className="font-medium">{generatedContent.title}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Meta Description ({generatedContent.meta_description?.length || 0}/155)</Label>
                    <p className="text-sm text-muted-foreground">{generatedContent.meta_description}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">H1</Label>
                    <p className="font-semibold text-lg">{generatedContent.h1}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">TL;DR</Label>
                    <p className="text-muted-foreground">{generatedContent.tldr}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="pt-4">
                <ContentSections sections={generatedContent.sections} />
              </TabsContent>

              <TabsContent value="faqs" className="pt-4">
                <FAQSection faqs={generatedContent.faqs || []} />
              </TabsContent>

              <TabsContent value="json" className="pt-4">
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(generatedContent, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Full Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{generatedContent?.title}</DialogTitle>
            <DialogDescription>{generatedContent?.meta_description}</DialogDescription>
          </DialogHeader>
          
          {generatedContent && (
            <div className="space-y-6 pt-4">
              <div className="bg-muted/50 border rounded-lg p-4">
                <p className="text-lg">{generatedContent.tldr}</p>
              </div>

              <ContentSections sections={generatedContent.sections} />

              {generatedContent.faqs && generatedContent.faqs.length > 0 && (
                <FAQSection faqs={generatedContent.faqs} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
