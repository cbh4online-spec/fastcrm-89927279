import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TemplateVersion } from '@/hooks/useTemplates';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { History, RotateCcw, Eye, FileText } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TemplateVersionHistoryProps {
  versions: TemplateVersion[];
  currentContent: string;
  onRestore: (version: TemplateVersion) => void;
}

export function TemplateVersionHistory({
  versions,
  currentContent,
  onRestore,
}: TemplateVersionHistoryProps) {
  const [previewVersion, setPreviewVersion] = useState<TemplateVersion | null>(null);

  if (versions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Sem histórico de versões</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-6 space-y-3">
          {versions.map((version, index) => (
            <Card key={version.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        v{version.version}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-500">
                          Atual
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(version.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
                    </p>
                    {version.change_summary && (
                      <p className="text-sm mt-1">{version.change_summary}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      {version.content.length} caracteres
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreviewVersion(version)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {index !== 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRestore(version)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restaurar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Version Preview Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Versão {previewVersion?.version}
              <Badge variant="outline" className="ml-2">
                {previewVersion && format(new Date(previewVersion.created_at), "d MMM yyyy HH:mm", { locale: pt })}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewVersion?.subject && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Assunto</label>
                <p className="mt-1 p-2 bg-muted rounded">{previewVersion.subject}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Conteúdo</label>
              <div className="mt-1 p-3 bg-muted rounded-lg max-h-[400px] overflow-auto">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {previewVersion?.content}
                </pre>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreviewVersion(null)}>
                Fechar
              </Button>
              {previewVersion && versions.findIndex(v => v.id === previewVersion.id) !== 0 && (
                <Button onClick={() => {
                  onRestore(previewVersion);
                  setPreviewVersion(null);
                }}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar esta versão
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
