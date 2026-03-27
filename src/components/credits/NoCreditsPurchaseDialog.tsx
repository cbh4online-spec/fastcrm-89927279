import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Zap, Loader2, Sparkles } from "lucide-react";
import { useCreditPurchase } from "@/hooks/useCreditPurchase";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { cn } from "@/lib/utils";

interface NoCreditsPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel?: string;
  creditsNeeded?: number;
}

export function NoCreditsPurchaseDialog({
  open,
  onOpenChange,
  actionLabel,
  creditsNeeded,
}: NoCreditsPurchaseDialogProps) {
  const { packages, packagesLoading, purchaseCredits } = useCreditPurchase();
  const { balance } = useCreditWallet();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Coins className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-xl">Créditos insuficientes</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {actionLabel ? (
              <>
                A ação <span className="font-medium text-foreground">"{actionLabel}"</span> requer{" "}
                {creditsNeeded ? (
                  <span className="font-semibold text-foreground">{creditsNeeded} crédito{creditsNeeded > 1 ? "s" : ""}</span>
                ) : (
                  "créditos"
                )}
                . O seu saldo atual é de{" "}
                <span className={cn("font-semibold", balance === 0 ? "text-destructive" : "text-foreground")}>
                  {balance}
                </span>.
              </>
            ) : (
              <>
                O seu saldo de créditos é{" "}
                <span className="font-semibold text-destructive">{balance}</span>.
                Adquira créditos para continuar a utilizar funcionalidades de IA.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Pacotes disponíveis
          </p>

          {packagesLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : packages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum pacote disponível de momento.
            </p>
          ) : (
            <div className="space-y-2">
              {packages.map((pkg, i) => (
                <button
                  key={pkg.id}
                  onClick={() => {
                    purchaseCredits.mutate(pkg.id);
                    onOpenChange(false);
                  }}
                  disabled={purchaseCredits.isPending}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left disabled:opacity-50",
                    i === 0
                      ? "border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 ring-1 ring-primary/20"
                      : "border-border hover:bg-accent hover:border-primary/30"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{pkg.credits_amount} créditos</p>
                      {i === 0 && (
                        <span className="text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          Popular
                        </span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-primary">€{pkg.price.toFixed(2)}</span>
                    <Zap className="h-3.5 w-3.5 text-primary" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => onOpenChange(false)}>
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
