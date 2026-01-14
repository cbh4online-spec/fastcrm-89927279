import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBlueprintVersions } from '@/hooks/useBlueprintVersions';
import { BlueprintVersionCompare } from './BlueprintVersionCompare';
import { CrmBlueprint } from '@/types/blueprint';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  History,
  RotateCcw,
  Eye,
  Clock,
  FileJson,
  Layers,
  GitBranch,
  GitCompare,
  X,
} from 'lucide-react';

interface BlueprintVersionHistoryProps {
  blueprintId: string | null;
  currentVersion: number;
  onRestore: (blueprint: CrmBlueprint) => void;
}

interface VersionForCompare {
  id: string;
  version: number;
  schema: CrmBlueprint;
}

export function BlueprintVersionHistory({
  blueprintId,
  currentVersion,
  onRestore,
}: BlueprintVersionHistoryProps) {
  const { versions, isLoading, restoreVersion } = useBlueprintVersions(blueprintId);
  const [open, setOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<CrmBlueprint | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<VersionForCompare[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  const handleRestore = async (versionId: string) => {
    const blueprint = await restoreVersion(versionId);
    if (blueprint) {
      onRestore(blueprint);
      setOpen(false);
      setConfirmRestore(null);
    }
  };

  const toggleVersionForCompare = (version: VersionForCompare) => {
    const isSelected = selectedForCompare.some((v) => v.id === version.id);
    if (isSelected) {
      setSelectedForCompare(selectedForCompare.filter((v) => v.id !== version.id));
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare([...selectedForCompare, version]);
    }
  };

  const handleCompare = () => {
    if (selectedForCompare.length === 2) {
      setShowCompareDialog(true);
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedForCompare([]);
  };

  if (!blueprintId) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          exitCompareMode();
        }
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            Histórico
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Histórico de Versões
            </DialogTitle>
          </DialogHeader>

          {/* Compare Mode Controls */}
          {versions.length >= 2 && (
            <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
              {compareMode ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <GitCompare className="h-4 w-4 text-primary" />
                    <span>
                      Selecione 2 versões para comparar ({selectedForCompare.length}/2)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={selectedForCompare.length !== 2}
                      onClick={handleCompare}
                    >
                      <GitCompare className="h-4 w-4 mr-1" />
                      Comparar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={exitCompareMode}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCompareMode(true)}
                  className="w-full"
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  Comparar Versões
                </Button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma versão anterior guardada.</p>
              <p className="text-sm mt-1">
                As versões são criadas automaticamente ao guardar alterações.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {versions.map((version, index) => {
                  const isCurrent = version.version === currentVersion;
                  const isLatest = index === 0;
                  const isSelectedForCompare = selectedForCompare.some((v) => v.id === version.id);

                  return (
                    <div
                      key={version.id}
                      className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${
                        isSelectedForCompare ? 'bg-primary/10 border-primary' :
                        isCurrent ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                      }`}
                    >
                      {compareMode && (
                        <div className="flex items-center justify-center pt-1">
                          <Checkbox
                            checked={isSelectedForCompare}
                            onCheckedChange={() => toggleVersionForCompare({
                              id: version.id,
                              version: version.version,
                              schema: version.schema,
                            })}
                            disabled={selectedForCompare.length >= 2 && !isSelectedForCompare}
                          />
                        </div>
                      )}
                      <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <FileJson className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">Versão {version.version}</span>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs">
                              Atual
                            </Badge>
                          )}
                          {isLatest && !isCurrent && (
                            <Badge variant="secondary" className="text-xs">
                              Mais recente
                            </Badge>
                          )}
                        </div>
                        
                        {version.changeSummary && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {version.changeSummary}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(version.createdAt), {
                              addSuffix: true,
                              locale: pt,
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {version.schema.customFields?.length || 0} campos
                          </span>
                        </div>
                      </div>
                      {!compareMode && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewVersion(version.schema)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isCurrent && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmRestore(version.id)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restaurar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Comparação de Versões
            </DialogTitle>
          </DialogHeader>
          {selectedForCompare.length === 2 && (
            <BlueprintVersionCompare
              versionA={{
                version: Math.min(selectedForCompare[0].version, selectedForCompare[1].version),
                schema: selectedForCompare[0].version < selectedForCompare[1].version 
                  ? selectedForCompare[0].schema 
                  : selectedForCompare[1].schema,
              }}
              versionB={{
                version: Math.max(selectedForCompare[0].version, selectedForCompare[1].version),
                schema: selectedForCompare[0].version > selectedForCompare[1].version 
                  ? selectedForCompare[0].schema 
                  : selectedForCompare[1].schema,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pré-visualização da Versão</DialogTitle>
          </DialogHeader>
          {previewVersion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium">Campos Personalizados</div>
                  <div className="text-2xl font-bold text-primary">
                    {previewVersion.customFields?.length || 0}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium">Etapas Pipeline</div>
                  <div className="text-2xl font-bold text-primary">
                    {previewVersion.pipelineStages?.length || 0}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium">Automações</div>
                  <div className="text-2xl font-bold text-primary">
                    {previewVersion.automations?.length || 0}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium">Secções</div>
                  <div className="text-2xl font-bold text-primary">
                    {previewVersion.sections?.length || 0}
                  </div>
                </div>
              </div>

              {previewVersion.customFields && previewVersion.customFields.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Campos:</div>
                  <div className="flex flex-wrap gap-1">
                    {previewVersion.customFields.slice(0, 10).map((field, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {field.name}
                      </Badge>
                    ))}
                    {previewVersion.customFields.length > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        +{previewVersion.customFields.length - 10} mais
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Restore Dialog */}
      <AlertDialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar Versão?</AlertDialogTitle>
            <AlertDialogDescription>
              O blueprint atual será substituído por esta versão anterior. 
              Guarde primeiro se quiser manter as alterações atuais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRestore && handleRestore(confirmRestore)}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
