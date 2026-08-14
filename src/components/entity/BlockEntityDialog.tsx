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

interface BlockEntityDialogProps {
  entity: ArchivableEntity;
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

export function BlockEntityDialog({ entity, ids, open, onOpenChange, onDone }: BlockEntityDialogProps) {
  const [reason, setReason] = useState("");
  const { block } = useEntityArchiveBlock(entity);
  const label = ENTITY_LABEL[entity].toLowerCase();
  const valid = reason.trim().length >= 3;

  const handleConfirm = async () => {
    if (!valid) return;
    await block.mutateAsync({ ids, reason });
    setReason("");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bloquear {label}</AlertDialogTitle>
          <AlertDialogDescription>
            Enquanto estiver bloqueado, não é possível enviar e-mails, WhatsApp, SMS, chamadas, sequências ou
            automações para este registo. Continua visível e pesquisável.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="block-reason">
            Motivo <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 300))}
            placeholder="Ex.: pediu para não ser contactado (RGPD)"
            rows={3}
          />
          {!valid && reason.length > 0 && (
            <p className="text-xs text-muted-foreground">Indique um motivo com pelo menos 3 caracteres.</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={block.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={!valid || block.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {block.isPending ? "A bloquear..." : "Bloquear"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
