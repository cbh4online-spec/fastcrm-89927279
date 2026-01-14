import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useBlueprints } from '@/hooks/useBlueprints';
import { CrmBlueprint } from '@/types/blueprint';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  FileJson,
  Trash2,
  Eye,
  Loader2,
  FolderOpen,
  CheckCircle2,
  Clock,
  Archive,
} from 'lucide-react';

interface SavedBlueprintsListProps {
  onLoadBlueprint: (blueprint: CrmBlueprint, dbId: string) => void;
}

export function SavedBlueprintsList({ onLoadBlueprint }: SavedBlueprintsListProps) {
  const { blueprints, isLoading, loadBlueprint, deleteBlueprint, isDeleting } = useBlueprints();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleLoad = async (id: string) => {
    setLoadingId(id);
    const result = await loadBlueprint(id);
    setLoadingId(null);
    if (result) {
      onLoadBlueprint(result.blueprint, result.dbId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'archived':
        return <Archive className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'active':
        return 'default';
      case 'archived':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'archived':
        return 'Arquivado';
      default:
        return 'Rascunho';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Blueprints Guardados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (blueprints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Blueprints Guardados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileJson className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum blueprint guardado.</p>
            <p className="text-sm mt-1">
              Gere um blueprint e guarde-o para revisão posterior.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Blueprints Guardados
          <Badge variant="secondary" className="ml-auto">
            {blueprints.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {blueprints.map((bp) => (
          <div
            key={bp.id}
            className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
              <FileJson className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{bp.name}</span>
                <Badge variant="outline" className="text-xs">
                  v{bp.version}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Badge variant={getStatusVariant(bp.status)} className="gap-1 text-xs">
                  {getStatusIcon(bp.status)}
                  {getStatusLabel(bp.status)}
                </Badge>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(bp.updatedAt), {
                    addSuffix: true,
                    locale: pt,
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLoad(bp.id)}
                disabled={loadingId === bp.id}
              >
                {loadingId === bp.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Carregar
                  </>
                )}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar Blueprint?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser revertida. O blueprint "{bp.name}" será
                      permanentemente eliminado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteBlueprint(bp.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
