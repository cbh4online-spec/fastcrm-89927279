import { Coins, AlertTriangle, Sparkles } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useCreditWallet } from "@/hooks/useCreditWallet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionKey: string;
  onConfirm: () => void;
  isLoading?: boolean;
  description?: string;
}

export function CreditConfirmDialog({
  open, onOpenChange, actionKey, onConfirm, isLoading, description,
}: Props) {
  const { getCost, getRule, balance, canAfford } = useCreditWallet();
  const cost = getCost(actionKey);
  const rule = getRule(actionKey);
  const affordable = canAfford(actionKey);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Confirmar acção de IA
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>{description || rule?.description || "Esta acção consome créditos."}</p>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{rule?.label || actionKey}</span>
                </div>
                <Badge variant="secondary" className="text-sm font-bold">
                  {cost} crédito{cost !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Saldo actual</span>
                <span className={`font-semibold ${affordable ? "text-foreground" : "text-destructive"}`}>
                  {balance} créditos
                </span>
              </div>

              {!affordable && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-sm text-destructive">
                    Créditos insuficientes. Necessita de {cost}, tem {balance}.
                  </span>
                </div>
              )}

              {affordable && (
                <div className="text-xs text-muted-foreground">
                  Após esta acção ficará com <strong>{balance - cost}</strong> créditos.
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!affordable || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                A processar...
              </>
            ) : (
              <>
                <Coins className="h-4 w-4" />
                Confirmar · {cost} crédito{cost !== 1 ? "s" : ""}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
