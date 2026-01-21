import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  CheckCircle2, 
  Edit, 
  Trash2, 
  HelpCircle,
  FileText,
  Clock,
  Search,
  Archive,
  Sparkles,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ENTRY_STATUS_CONFIG } from '@/types/knowledge-base';
import type { KnowledgeEntry, EntryStatus } from '@/types/knowledge-base';

interface KnowledgeEntriesPanelProps {
  entries: KnowledgeEntry[];
  isLoading: boolean;
  knowledgeBaseId?: string;
  onValidate: (entryId: string) => Promise<void>;
  onUpdate: (entryId: string, data: Partial<KnowledgeEntry>) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
  onArchive: (entryId: string) => Promise<void>;
  onSemanticSearch?: (query: string, kbId?: string) => Promise<KnowledgeEntry[]>;
}

export function KnowledgeEntriesPanel({
  entries,
  isLoading,
  knowledgeBaseId,
  onValidate,
  onUpdate,
  onDelete,
  onArchive,
  onSemanticSearch
}: KnowledgeEntriesPanelProps) {
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<EntryStatus | 'all'>('all');
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<KnowledgeEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Semantic search state
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text');
  const [semanticResults, setSemanticResults] = useState<(KnowledgeEntry & { similarity?: number })[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editQuestion, setEditQuestion] = useState('');
  const [editContent, setEditContent] = useState('');

  // Debounced semantic search
  useEffect(() => {
    if (searchMode !== 'semantic' || !searchValue.trim() || !onSemanticSearch) {
      setSemanticResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await onSemanticSearch(searchValue, knowledgeBaseId);
        setSemanticResults(results);
      } catch (error) {
        console.error('Semantic search error:', error);
        setSemanticResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue, searchMode, knowledgeBaseId, onSemanticSearch]);

  // Reset semantic results when switching modes
  useEffect(() => {
    if (searchMode === 'text') {
      setSemanticResults([]);
    }
  }, [searchMode]);

  // Determine which entries to display
  const displayEntries = searchMode === 'semantic' && searchValue.trim() 
    ? semanticResults 
    : entries;

  const filteredEntries = displayEntries.filter(entry => {
    // Text search filter (only apply if in text mode)
    const matchesSearch = searchMode === 'semantic' || !searchValue.trim() ||
      entry.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchValue.toLowerCase()) ||
      (entry.question?.toLowerCase().includes(searchValue.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleOpenEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setEditTitle(entry.title);
    setEditQuestion(entry.question || '');
    setEditContent(entry.content);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    setIsSubmitting(true);
    await onUpdate(editingEntry.id, {
      title: editTitle,
      question: editQuestion || undefined,
      content: editContent
    });
    setIsSubmitting(false);
    setEditingEntry(null);
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;
    setIsSubmitting(true);
    await onDelete(deletingEntry.id);
    setIsSubmitting(false);
    setDeletingEntry(null);
  };

  const handleValidate = async (entryId: string) => {
    setIsSubmitting(true);
    await onValidate(entryId);
    setIsSubmitting(false);
  };

  const toggleSearchMode = useCallback(() => {
    setSearchMode(prev => prev === 'text' ? 'semantic' : 'text');
  }, []);

  const getEntryTypeIcon = (type: string) => {
    return type === 'faq' ? HelpCircle : FileText;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Entradas ({entries.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400">
                {entries.filter(e => e.status === 'draft').length} rascunhos
              </Badge>
              <Badge variant="outline" className="text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400">
                {entries.filter(e => e.status === 'validated').length} validados
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Perguntas/respostas geradas pela IA. Valida para usar no atendimento.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchMode === 'semantic' ? "Busca semântica IA..." : "Pesquisar entradas..."}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9 pr-9"
              />
              {isSearching && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            
            {/* Semantic Search Toggle */}
            {onSemanticSearch && (
              <Button
                variant={searchMode === 'semantic' ? 'default' : 'outline'}
                size="sm"
                onClick={toggleSearchMode}
                className={searchMode === 'semantic' ? 'bg-primary text-primary-foreground' : ''}
                title={searchMode === 'semantic' ? 'Busca Semântica ativa' : 'Ativar Busca IA'}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Busca IA
              </Button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1">
            <Button
              variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === 'draft' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('draft')}
            >
              <Edit className="h-3 w-3 mr-1" />
              Rascunhos
            </Button>
            <Button
              variant={statusFilter === 'validated' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('validated')}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Validados
            </Button>
          </div>

          {/* Semantic Search Info */}
          {searchMode === 'semantic' && searchValue.trim() && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {isSearching ? (
                <span>A procurar resultados semelhantes...</span>
              ) : semanticResults.length > 0 ? (
                <span>Encontrados {semanticResults.length} resultados por similaridade</span>
              ) : (
                <span>Nenhum resultado semelhante encontrado</span>
              )}
            </div>
          )}

          {/* Entries List */}
          <ScrollArea className="h-[400px] pr-4">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Nenhuma entrada encontrada</p>
                {searchMode === 'semantic' && searchValue.trim() && (
                  <p className="text-xs mt-1">Tente termos diferentes ou mude para busca textual</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map(entry => {
                  const TypeIcon = getEntryTypeIcon(entry.entryType);
                  const statusConfig = ENTRY_STATUS_CONFIG[entry.status];
                  const similarity = (entry as any).similarity;
                  
                  return (
                    <div 
                      key={entry.id} 
                      className="p-4 border rounded-lg hover:border-primary/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium text-sm truncate">
                              {entry.title}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`${statusConfig.bgColor} ${statusConfig.color} text-xs shrink-0`}
                            >
                              {statusConfig.label}
                            </Badge>
                            {/* Similarity Badge for semantic results */}
                            {similarity !== undefined && (
                              <Badge 
                                variant="outline" 
                                className="bg-primary/10 text-primary text-xs shrink-0"
                              >
                                {Math.round(similarity * 100)}% similar
                              </Badge>
                            )}
                          </div>
                          
                          {entry.question && (
                            <p className="text-sm text-primary font-medium mb-1">
                              {entry.question}
                            </p>
                          )}
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {entry.content}
                          </p>
                          
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(entry.createdAt), 'dd MMM yyyy', { locale: pt })}
                            </span>
                            {entry.keywords && entry.keywords.length > 0 && (
                              <span className="truncate">
                                {entry.keywords.slice(0, 3).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {entry.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30"
                              onClick={() => handleValidate(entry.id)}
                              disabled={isSubmitting}
                              title="Validar"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEdit(entry)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {entry.status === 'validated' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => onArchive(entry.id)}
                              title="Arquivar"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingEntry(entry)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Entrada</DialogTitle>
            <DialogDescription>
              Modifica o conteúdo desta entrada de conhecimento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Título da entrada"
              />
            </div>
            <div>
              <Label>Pergunta (para FAQs)</Label>
              <Input
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                placeholder="Ex: Como posso...?"
              />
            </div>
            <div>
              <Label>Conteúdo / Resposta</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Conteúdo da entrada..."
                className="min-h-[150px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              Guardar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEntry} onOpenChange={() => setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A entrada "{deletingEntry?.title}" será permanentemente eliminada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
