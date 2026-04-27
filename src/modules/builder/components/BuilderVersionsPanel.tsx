import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { History, Plus, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  useBuilderVersions,
  useCreateBuilderVersion,
  type BuilderAssetVersion,
} from "../hooks/useBuilderVersions";

interface Props {
  assetId: string;
  workspaceId: string;
  currentHtml: string;
  onRestore: (html: string, version: BuilderAssetVersion) => void;
}

export function BuilderVersionsPanel({ assetId, workspaceId, currentHtml, onRestore }: Props) {
  const { data: versions = [], isLoading } = useBuilderVersions(assetId);
  const createVersion = useCreateBuilderVersion();

  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<BuilderAssetVersion | null>(null);

  const handleSnapshot = async () => {
    try {
      await createVersion.mutateAsync({
        assetId,
        workspaceId,
        html: currentHtml,
        notes,
      });
      toast.success("Versão guardada");
      setSnapshotOpen(false);
      setNotes("");
    } catch (err) {
      toast.error("Erro ao guardar versão", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Versões</span>
          {versions.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {versions.length}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setSnapshotOpen(true)} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Snapshot
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : versions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 px-3">
              Sem versões guardadas. Cria um snapshot para fixar o estado atual.
            </p>
          ) : (
            versions.map((v) => (
              <div
                key={v.id}
                className="group p-2.5 rounded-md hover:bg-muted/60 transition border border-transparent hover:border-border"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono">
                        v{v.version_number}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: pt })}
                      </span>
                    </div>
                    {v.notes && (
                      <p className="text-xs text-foreground/80 mt-1 line-clamp-2">{v.notes}</p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => setRestoreTarget(v)}
                    aria-label="Restaurar esta versão"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={snapshotOpen} onOpenChange={setSnapshotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar snapshot</DialogTitle>
            <DialogDescription>
              Cria uma versão do estado actual. Útil antes de mudanças grandes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Notas (opcional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              placeholder="Ex: antes de redesenhar a hero…"
              rows={3}
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground text-right">{notes.length}/500</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSnapshotOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSnapshot} disabled={createVersion.isPending}>
              {createVersion.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Guardar versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão v{restoreTarget?.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              O conteúdo actual será substituído. As alterações por guardar serão perdidas. Podes
              criar um snapshot antes de restaurar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restoreTarget) {
                  onRestore(restoreTarget.html, restoreTarget);
                  setRestoreTarget(null);
                }
              }}
            >
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
