import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  FileText,
  Trash2,
  Search,
  Brain,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  File,
  X,
} from 'lucide-react';
import { useKnowledgeDocuments } from '@/hooks/useKnowledgeDocuments';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { KnowledgeDocument } from '@/types/knowledge';

interface KnowledgeDocumentsPanelProps {
  knowledgeBaseId: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: 'Pendente', icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
  processing: { label: 'A processar', icon: <Loader2 className="h-4 w-4 animate-spin" />, color: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  embedding: { label: 'Embeddings', icon: <Sparkles className="h-4 w-4 animate-pulse" />, color: 'bg-purple-500/10 text-purple-700 border-purple-200' },
  ready: { label: 'Pronto', icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-green-500/10 text-green-700 border-green-200' },
  error: { label: 'Erro', icon: <AlertCircle className="h-4 w-4" />, color: 'bg-red-500/10 text-red-700 border-red-200' },
};

const ACCEPT_TYPES = '.pdf,.txt,.md,.docx';

export function KnowledgeDocumentsPanel({ knowledgeBaseId }: KnowledgeDocumentsPanelProps) {
  const {
    documents,
    isLoading,
    uploadDocument,
    isUploading,
    deleteDocument,
    semanticSearch,
    searchResults,
    isSearching,
    ragQuery,
    ragResult,
    isQuerying,
    clearSearch,
    clearRag,
  } = useKnowledgeDocuments(knowledgeBaseId);

  const [activeTab, setActiveTab] = useState<'docs' | 'search' | 'ask'>('docs');
  const [searchQuery, setSearchQuery] = useState('');
  const [ragQuestion, setRagQuestion] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        await uploadDocument(file);
      }
    },
    [uploadDocument]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  if (!knowledgeBaseId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Seleciona uma base de conhecimento para ver os documentos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="docs" className="flex items-center gap-1 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            Documentos ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-1 text-xs sm:text-sm">
            <Search className="h-3.5 w-3.5" />
            Pesquisa Semântica
          </TabsTrigger>
          <TabsTrigger value="ask" className="flex items-center gap-1 text-xs sm:text-sm">
            <Brain className="h-3.5 w-3.5" />
            Perguntar à Base
          </TabsTrigger>
        </TabsList>

        {/* ─── DOCUMENTS TAB ─── */}
        <TabsContent value="docs" className="mt-4 space-y-4">
          {/* Upload Zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_TYPES}
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            {isUploading ? (
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
            ) : (
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            )}
            <p className="text-sm font-medium">
              {isUploading ? 'A enviar...' : 'Arrasta ficheiros ou clica para enviar'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, TXT, MD, DOCX (máx. 20MB)</p>
          </div>

          {/* Document List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : documents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <File className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum documento vectorial ainda</p>
                <p className="text-xs mt-1">Envia um ficheiro para começar</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
                return (
                  <Card key={doc.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={cn('text-xs', statusCfg.color)}>
                            {statusCfg.icon}
                            <span className="ml-1">{statusCfg.label}</span>
                          </Badge>
                          {doc.chunk_count > 0 && (
                            <span className="text-xs text-muted-foreground">{doc.chunk_count} chunks</span>
                          )}
                          {doc.file_size && (
                            <span className="text-xs text-muted-foreground">
                              {(doc.file_size / 1024 / 1024).toFixed(1)}MB
                            </span>
                          )}
                        </div>
                        {doc.error_message && doc.status !== 'ready' && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{doc.error_message}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── SEMANTIC SEARCH TAB ─── */}
        <TabsContent value="search" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && semanticSearch(searchQuery)}
                placeholder="Pesquisar por similaridade semântica..."
                className="pl-9"
              />
            </div>
            <Button onClick={() => semanticSearch(searchQuery)} disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            {searchResults.length > 0 && (
              <Button variant="ghost" size="icon" onClick={() => { clearSearch(); setSearchQuery(''); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{searchResults.length} resultados</p>
              {searchResults.map((result) => (
                <Card key={result.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm line-clamp-3">{result.content}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'flex-shrink-0',
                          result.similarity >= 0.7 ? 'bg-green-50 text-green-700 border-green-200' :
                          result.similarity >= 0.5 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-muted'
                        )}
                      >
                        {Math.round(result.similarity * 100)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isSearching && searchResults.length === 0 && searchQuery && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Sem resultados. Tente outra pesquisa.
            </p>
          )}
        </TabsContent>

        {/* ─── ASK RAG TAB ─── */}
        <TabsContent value="ask" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              value={ragQuestion}
              onChange={(e) => setRagQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ragQuery(ragQuestion)}
              placeholder="Faça uma pergunta à base de conhecimento..."
            />
            <Button onClick={() => ragQuery(ragQuestion)} disabled={isQuerying || !ragQuestion.trim()}>
              {isQuerying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {isQuerying && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">A consultar a base de conhecimento...</p>
              </CardContent>
            </Card>
          )}

          {ragResult && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Resposta RAG</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round((ragResult.confidence || 0) * 100)}% confiança
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {ragResult.responseTimeMs}ms
                  </span>
                </div>
                <ScrollArea className="max-h-[400px]">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{ragResult.answer}</ReactMarkdown>
                  </div>
                </ScrollArea>
                {ragResult.sources && ragResult.sources.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Fontes ({ragResult.sources.length})</p>
                    <div className="space-y-1">
                      {ragResult.sources.map((src, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {Math.round(src.similarity * 100)}%
                          </Badge>
                          <span className="truncate">{src.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!isQuerying && !ragResult && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Faça uma pergunta para obter uma resposta contextualizada</p>
                <p className="text-xs mt-1">Usa busca vectorial + IA para gerar respostas precisas</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
