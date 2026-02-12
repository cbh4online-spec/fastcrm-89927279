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

interface InterestConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function InterestConfirmDialog({ open, onOpenChange, companyName, onConfirm, isLoading }: InterestConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Demonstrar Interesse</AlertDialogTitle>
          <AlertDialogDescription>
            Pretende demonstrar interesse em <strong>{companyName}</strong>?
            <br />
            <span className="text-xs text-muted-foreground mt-2 block">
              Se o interesse for mútuo, será necessário consumir uma quota ou crédito extra para desbloquear a conexão.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "A processar..." : "Confirmar Interesse"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
