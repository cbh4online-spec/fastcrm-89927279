import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Link, 
  FileText, 
  Edit, 
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { KnowledgeSource, ProcessingStatus } from '@/types/knowledge-base';

interface KnowledgeSourcesPanelProps {
  sources: KnowledgeSource[];
  isLoading: boolean;
  onReprocess?: (sourceId: string) => Promise<void>;
}

const STATUS_CONFIG: Record<ProcessingStatus, { label: string; icon: typeof CheckCircle2; color: string; bgColor: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/30' },
  processing: { label: 'A processar', icon: Loader2, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
  completed: { label: 'Concluído', icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/30' },
  failed: { label: 'Erro', icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/30' }
};

const SOURCE_TYPE_ICONS: Record<string, typeof Link> = {
  url: Link,
  document: FileText,
  manual: Edit
};

export function KnowledgeSourcesPanel({
  sources,
  isLoading,
  onReprocess
}: KnowledgeSourcesPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fontes Processadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Fontes Processadas ({sources.length})
          </CardTitle>
          <Badge variant="outline" className="text-green-600 bg-green-50">
            {sources.filter(s => s.processingStatus === 'completed').length} processadas
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          URLs e documentos que foram processados pela IA.
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {sources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Nenhuma fonte processada</p>
              <p className="text-xs mt-1">Adiciona URLs ou documentos para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map(source => {
                const statusConfig = STATUS_CONFIG[source.processingStatus];
                const StatusIcon = statusConfig.icon;
                const SourceIcon = SOURCE_TYPE_ICONS[source.sourceType] || FileText;
                
                return (
                  <div 
                    key={source.id} 
                    className="p-3 border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <SourceIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {source.sourceType === 'url' ? 'URL' : 
                             source.sourceType === 'document' ? 'Documento' : 'Manual'}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`${statusConfig.bgColor} ${statusConfig.color} text-xs shrink-0`}
                          >
                            <StatusIcon className={`h-3 w-3 mr-1 ${source.processingStatus === 'processing' ? 'animate-spin' : ''}`} />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        
                        {source.sourceUrl && (
                          <a 
                            href={source.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1 mb-1"
                          >
                            {source.sourceUrl.slice(0, 50)}{source.sourceUrl.length > 50 ? '...' : ''}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        
                        {source.processedContent && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {source.processedContent}
                          </p>
                        )}
                        
                        {source.processingError && (
                          <p className="text-sm text-destructive mt-1">
                            Erro: {source.processingError}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(source.createdAt), 'dd MMM yyyy HH:mm', { locale: pt })}
                          </span>
                          {source.extractedTopics && source.extractedTopics.length > 0 && (
                            <span className="truncate">
                              Tópicos: {source.extractedTopics.slice(0, 3).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {source.processingStatus === 'failed' && onReprocess && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onReprocess(source.id)}
                          title="Reprocessar"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
