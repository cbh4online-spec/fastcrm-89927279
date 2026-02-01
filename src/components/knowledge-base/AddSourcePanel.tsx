import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Link, 
  FileText, 
  Edit, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  File,
  X
} from 'lucide-react';

interface AddSourcePanelProps {
  onAddUrl: (url: string) => Promise<void>;
  onAddManual: (data: { title: string; question?: string; content: string }) => Promise<void>;
  onAddDocument?: (file: File) => Promise<void>;
  isProcessing?: boolean;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt'
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const OPTIMAL_PROCESSING_SIZE = 20 * 1024 * 1024; // 20MB - for optimal processing

export function AddSourcePanel({ 
  onAddUrl, 
  onAddManual,
  onAddDocument,
  isProcessing 
}: AddSourcePanelProps) {
  const [activeTab, setActiveTab] = useState('url');
  const [url, setUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualQuestion, setManualQuestion] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      alert('Ficheiro demasiado grande. Máximo 100MB.');
      return;
    }
    
    const isValidType = Object.keys(ACCEPTED_FILE_TYPES).includes(file.type) || 
                        file.name.endsWith('.txt') || 
                        file.name.endsWith('.pdf') ||
                        file.name.endsWith('.doc') ||
                        file.name.endsWith('.docx');
    
    if (!isValidType) {
      alert('Tipo de ficheiro não suportado. Use PDF, Word ou TXT.');
      return;
    }
    
    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmitDocument = async () => {
    if (!selectedFile || !onAddDocument) return;
    await onAddDocument(selectedFile);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : selectedFile 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-3">
                  <File className="h-10 w-10 mx-auto text-green-600" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Arrastar documento ou clicar</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PDF, Word, TXT até 100MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                id="doc-upload"
                onChange={handleFileInputChange}
              />
              {!selectedFile && (
                <Button variant="outline" className="mt-4" asChild>
                  <label htmlFor="doc-upload" className="cursor-pointer">
                    Escolher Ficheiro
                  </label>
                </Button>
              )}
            </div>
            
            {selectedFile && (
              <>
                {selectedFile.size > OPTIMAL_PROCESSING_SIZE && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm border border-amber-200 dark:border-amber-700">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-amber-700 dark:text-amber-400">
                      <span className="font-medium">Ficheiro grande ({formatFileSize(selectedFile.size)})</span>
                      <p className="text-xs mt-1">
                        Apenas os primeiros 20MB serão processados para extrair conteúdo. 
                        O ficheiro completo fica guardado.
                      </p>
                    </div>
                  </div>
                )}
                <Button 
                  onClick={handleSubmitDocument} 
                  disabled={!onAddDocument || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A processar documento...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Processar Documento
                    </>
                  )}
                </Button>
              </>
            )}
            
            {!selectedFile && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700 dark:text-blue-400">
                  O documento será processado pela IA para extrair FAQs e conteúdo.
                </span>
              </div>
            )}
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
