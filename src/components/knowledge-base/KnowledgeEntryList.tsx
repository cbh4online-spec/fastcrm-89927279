import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Plus, 
  Search,
  CheckCircle2,
  Edit,
  Archive,
  Filter,
  Eye,
  BarChart3,
  Trash2,
  HelpCircle,
  ClipboardList,
  MessageSquare,
  ExternalLink,
  File
} from 'lucide-react';
import { 
  KnowledgeEntry, 
  EntryStatus,
  EntryType,
  ENTRY_TYPE_CONFIG, 
  ENTRY_STATUS_CONFIG,
  CONTEXT_CONFIG
} from '@/types/knowledge-base';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface KnowledgeEntryListProps {
  entries: KnowledgeEntry[];
  isLoading?: boolean;
  onSelect?: (entry: KnowledgeEntry) => void;
  onValidate?: (entryId: string) => void;
  onArchive?: (entryId: string) => void;
  onDelete?: (entryId: string) => void;
  onCreateNew?: () => void;
}

const getEntryIcon = (type: EntryType) => {
  const icons = {
    faq: HelpCircle,
    article: FileText,
    document: File,
    procedure: ClipboardList,
    script: MessageSquare,
    link: ExternalLink
  };
  return icons[type] || FileText;
};

export function KnowledgeEntryList({ 
  entries, 
  isLoading,
  onSelect,
  onValidate,
  onArchive,
  onDelete,
  onCreateNew
}: KnowledgeEntryListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EntryStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<EntryType | 'all'>('all');

  const filtered = entries.filter(entry => {
    const matchesSearch = 
      entry.title.toLowerCase().includes(search.toLowerCase()) ||
      entry.content?.toLowerCase().includes(search.toLowerCase()) ||
      entry.question?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    const matchesType = typeFilter === 'all' || entry.entryType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: entries.length,
    validated: entries.filter(e => e.status === 'validated').length,
    draft: entries.filter(e => e.status === 'draft').length,
    archived: entries.filter(e => e.status === 'archived').length
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Entradas de Conhecimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-5 w-48 bg-muted rounded mb-2" />
                <div className="h-4 w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Entradas de Conhecimento
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Só conteúdos validados são usados pela IA.
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Entrada
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.validated}</div>
            <div className="text-xs text-green-600 dark:text-green-400">Validados</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-center">
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.draft}</div>
            <div className="text-xs text-amber-600 dark:text-amber-400">Rascunhos</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.archived}</div>
            <div className="text-xs text-gray-500">Arquivados</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar entradas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EntryStatus | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {Object.entries(ENTRY_STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as EntryType | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(ENTRY_TYPE_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/30">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma entrada encontrada</p>
            <p className="text-sm mb-4">
              Cria a primeira entrada de conhecimento.
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Entrada
            </Button>
          </div>
        )}

        {/* Entries List */}
        <div className="space-y-3">
          {filtered.map((entry) => {
            const typeConfig = ENTRY_TYPE_CONFIG[entry.entryType] || ENTRY_TYPE_CONFIG.article;
            const statusConfig = ENTRY_STATUS_CONFIG[entry.status] || ENTRY_STATUS_CONFIG.draft;
            const contextConfig = entry.context ? CONTEXT_CONFIG[entry.context] : null;
            const Icon = getEntryIcon(entry.entryType);

            return (
              <div
                key={entry.id}
                className={cn(
                  "p-4 border rounded-lg transition-all hover:shadow-md",
                  entry.status === 'validated' && "border-green-200 dark:border-green-900/50",
                  entry.status === 'draft' && "border-amber-200 dark:border-amber-900/50",
                  entry.status === 'archived' && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div 
                    className="flex items-start gap-3 flex-1 cursor-pointer"
                    onClick={() => onSelect?.(entry)}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                      statusConfig.bgColor
                    )}>
                      <Icon className={cn("h-5 w-5", statusConfig.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{entry.title}</h3>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {typeConfig.label}
                        </Badge>
                        <Badge className={cn("text-xs shrink-0", statusConfig.bgColor, statusConfig.color)}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      
                      {entry.question && (
                        <p className="text-sm text-primary mt-1 font-medium">
                          Q: {entry.question}
                        </p>
                      )}
                      
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {entry.content}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        {contextConfig && (
                          <Badge variant="outline" className={cn("text-xs", contextConfig.color)}>
                            {contextConfig.label}
                          </Badge>
                        )}
                        {entry.category && (
                          <span className="flex items-center gap-1">
                            <Filter className="h-3 w-3" />
                            {entry.category}
                          </span>
                        )}
                        {entry.usageCount > 0 && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {entry.usageCount} usos
                          </span>
                        )}
                        {entry.validatedAt && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Validado {format(new Date(entry.validatedAt), "d MMM", { locale: pt })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {entry.status === 'draft' && onValidate && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onValidate(entry.id);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect?.(entry);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {entry.status !== 'archived' && onArchive && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchive(entry.id);
                        }}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
