import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Link, 
  FileText, 
  Edit, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload
} from 'lucide-react';

interface AddSourcePanelProps {
  onAddUrl: (url: string) => Promise<void>;
  onAddManual: (data: { title: string; question?: string; content: string }) => Promise<void>;
  isProcessing?: boolean;
}

export function AddSourcePanel({ 
  onAddUrl, 
  onAddManual,
  isProcessing 
}: AddSourcePanelProps) {
  const [activeTab, setActiveTab] = useState('url');
  const [url, setUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualQuestion, setManualQuestion] = useState('');
  const [manualContent, setManualContent] = useState('');

  const handleSubmitUrl = async () => {
    if (!url.trim()) return;
    await onAddUrl(url);
    setUrl('');
  };

  const handleSubmitManual = async () => {
    if (!manualTitle.trim() || !manualContent.trim()) return;
    await onAddManual({
      title: manualTitle,
      question: manualQuestion || undefined,
      content: manualContent
    });
    setManualTitle('');
    setManualQuestion('');
    setManualContent('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Adicionar Conhecimento</CardTitle>
        <p className="text-sm text-muted-foreground">
          Adiciona informação uma vez. A IA aprende e reutiliza.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="url" className="flex items-center gap-1">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="document" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Documento
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-1">
              <Edit className="h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          {/* URL Tab */}
          <TabsContent value="url" className="space-y-4 mt-4">
            <div>
              <Label>URL do site ou página</Label>
              <Input
                type="url"
                placeholder="https://exemplo.com/sobre"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O sistema extrai automaticamente o conteúdo relevante.
              </p>
            </div>
            <Button 
              onClick={handleSubmitUrl} 
              disabled={!url.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Extrair Conteúdo
                </>
              )}
            </Button>
          </TabsContent>

          {/* Document Tab */}
          <TabsContent value="document" className="space-y-4 mt-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Arrastar documento ou clicar</p>
              <p className="text-sm text-muted-foreground mt-1">
                PDF, Word, TXT até 10MB
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                id="doc-upload"
              />
              <Button variant="outline" className="mt-4" asChild>
                <label htmlFor="doc-upload" className="cursor-pointer">
                  Escolher Ficheiro
                </label>
              </Button>
            </div>
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-700 dark:text-amber-400">
                Upload de documentos será processado pela IA.
              </span>
            </div>
          </TabsContent>

          {/* Manual Tab */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div>
              <Label>Título / Tópico</Label>
              <Input
                placeholder="Ex: Política de devolução"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Pergunta (opcional, para FAQs)</Label>
              <Input
                placeholder="Ex: Como posso devolver um produto?"
                value={manualQuestion}
                onChange={(e) => setManualQuestion(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Conteúdo / Resposta</Label>
              <Textarea
                placeholder="Escreve aqui o conteúdo ou resposta..."
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                className="mt-1 min-h-[120px]"
              />
            </div>
            <Button 
              onClick={handleSubmitManual} 
              disabled={!manualTitle.trim() || !manualContent.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Adicionar Entrada
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
