import { useState } from "react";
import { Coins, AlertTriangle, Sparkles, Loader2, Zap, Crown } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { useCreditPurchase } from "@/hooks/useCreditPurchase";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionKey: string;
  onConfirm: () => void;
  isLoading?: boolean;
  description?: string;
}

const pkgIcons = [Zap, Sparkles, Crown];

export function CreditConfirmDialog({
  open, onOpenChange, actionKey, onConfirm, isLoading, description,
}: Props) {
  const { getCost, getRule, balance, canAfford } = useCreditWallet();
  const { packages, packagesLoading, purchaseCredits } = useCreditPurchase();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const cost = getCost(actionKey);
  const rule = getRule(actionKey);
  const affordable = canAfford(actionKey);

  const handleBuy = async (packageId: string) => {
    setBuyingId(packageId);
    try {
      await purchaseCredits.mutateAsync(packageId);
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
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
                <>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-sm text-destructive">
                      Créditos insuficientes. Necessita de {cost}, tem {balance}.
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Recarregar créditos:</p>
                    {packagesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {packages.map((pkg, i) => {
                          const Icon = pkgIcons[i] || Coins;
                          const loading = buyingId === pkg.id;
                          return (
                            <Button
                              key={pkg.id}
                              variant="outline"
                              size="sm"
                              className="w-full justify-between h-auto py-2.5 px-3"
                              disabled={loading || purchaseCredits.isPending}
                              onClick={() => handleBuy(pkg.id)}
                            >
                              <span className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-primary" />
                                <span className="font-medium">{pkg.credits_amount} créditos</span>
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="text-muted-foreground">€{pkg.price.toFixed(2)}</span>
                                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
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
          {affordable && (
            <AlertDialogAction
              onClick={onConfirm}
              disabled={isLoading}
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
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
