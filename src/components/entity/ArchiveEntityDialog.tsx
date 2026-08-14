import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ENTITY_LABEL, useEntityArchiveBlock, type ArchivableEntity } from "@/hooks/useEntityArchiveBlock";

interface ArchiveEntityDialogProps {
  entity: ArchivableEntity;
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
  /** Aviso extra, ex.: nº de contactos associados a uma empresa. */
  warning?: string;
}

export function ArchiveEntityDialog({ entity, ids, open, onOpenChange, onDone, warning }: ArchiveEntityDialogProps) {
  const [reason, setReason] = useState("");
  const { archive } = useEntityArchiveBlock(entity);
  const label = ENTITY_LABEL[entity].toLowerCase();

  const handleConfirm = async () => {
    await archive.mutateAsync({ ids, reason });
    setReason("");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setReason("");
        onOpenChange(o);
      }}
    >
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {ids.length > 1 ? `Arquivar ${ids.length} registos` : `Arquivar ${label}`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            O registo deixa de aparecer nas listas de ativos e nos seletores, mas nada é apagado. Pode desarquivar a
            qualquer momento através do filtro "Arquivados".
            {warning ? ` ${warning}` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="archive-reason">Motivo (opcional)</Label>
          <Textarea
            id="archive-reason"
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 300))}
            placeholder="Ex.: cliente inativo desde 2024"
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={archive.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={archive.isPending}
          >
            {archive.isPending ? "A arquivar..." : "Arquivar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
