import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Plus, 
  Search,
  Settings,
  Power,
  Folder,
  FileText,
  CheckCircle
} from 'lucide-react';
import { KnowledgeBase, KNOWLEDGE_BASE_TYPES } from '@/types/knowledge-base';
import { cn } from '@/lib/utils';

interface KnowledgeBaseListProps {
  knowledgeBases: KnowledgeBase[];
  isLoading?: boolean;
  onSelect?: (kb: KnowledgeBase) => void;
  onCreateNew?: () => void;
}

export function KnowledgeBaseList({ 
  knowledgeBases, 
  isLoading,
  onSelect,
  onCreateNew
}: KnowledgeBaseListProps) {
  const [search, setSearch] = useState('');

  const filtered = knowledgeBases.filter(kb => 
    kb.name.toLowerCase().includes(search.toLowerCase()) ||
    kb.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Bases de Conhecimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-5 w-40 bg-muted rounded mb-2" />
                <div className="h-4 w-60 bg-muted rounded" />
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
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Bases de Conhecimento
        </CardTitle>
        <Button onClick={onCreateNew} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nova Base
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar bases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">A IA ainda não tem informação suficiente.</p>
            <p className="text-sm mb-4">
              Adiciona um site, documento ou FAQ para começar.
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-1" />
              Criar Base de Conhecimento
            </Button>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {filtered.map((kb) => {
            const typeConfig = KNOWLEDGE_BASE_TYPES[kb.type as keyof typeof KNOWLEDGE_BASE_TYPES] || 
                               KNOWLEDGE_BASE_TYPES.general;

            return (
              <div
                key={kb.id}
                className={cn(
                  "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                  !kb.isActive && "opacity-60"
                )}
                onClick={() => onSelect?.(kb)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      kb.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Folder className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{kb.name}</h3>
                        {!kb.isActive && (
                          <Badge variant="outline" className="text-xs">Inativa</Badge>
                        )}
                      </div>
                      {kb.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {kb.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {kb.entriesCount || 0} entradas
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {kb.validatedEntriesCount || 0} validadas
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {typeConfig.label}
                  </Badge>
                </div>

                {/* Channels */}
                {kb.allowedChannels && kb.allowedChannels.length > 0 && (
                  <div className="flex items-center gap-1 mt-3">
                    <span className="text-xs text-muted-foreground mr-1">Canais:</span>
                    {kb.allowedChannels.map((channel) => (
                      <Badge key={channel} variant="outline" className="text-xs">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
