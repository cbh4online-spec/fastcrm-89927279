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
import { Loader2, Trophy } from "lucide-react";
import { useAdjudicateOpportunity } from "@/hooks/proposals/useQuickProposal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string;
  opportunityTitle: string;
}

export function AdjudicateDialog({ open, onOpenChange, opportunityId, opportunityTitle }: Props) {
  const adj = useAdjudicateOpportunity();

  const handleConfirm = async () => {
    try {
      await adj.mutateAsync(opportunityId);
      onOpenChange(false);
    } catch {
      /* toast já mostrado */
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Adjudicar negócio
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>"{opportunityTitle}"</strong> será marcado como ganho. Será gerada uma fatura
            automaticamente (e sincronizada com o seu programa de faturação se estiver ativo) e enviada
            ao cliente por WhatsApp.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={adj.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={adj.isPending}>
            {adj.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adjudicar e faturar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
