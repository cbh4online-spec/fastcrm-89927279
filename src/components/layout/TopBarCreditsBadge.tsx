import { Coins, Zap, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { useCreditPurchase } from "@/hooks/useCreditPurchase";
import { cn } from "@/lib/utils";

export function TopBarCreditsBadge() {
  const { balance, walletLoading } = useCreditWallet();
  const { packages, packagesLoading, purchaseCredits } = useCreditPurchase();

  const isLow = balance <= 10;

  if (walletLoading) {
    return (
      <Badge variant="outline" className="gap-1.5 animate-pulse h-8 px-2.5">
        <Coins className="h-3.5 w-3.5" />
        <span className="text-xs">...</span>
      </Badge>
    );
  }

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 cursor-pointer transition-colors h-8 px-2.5 hover:bg-accent",
                isLow
                  ? "border-destructive/50 text-destructive"
                  : "border-primary/30 text-primary"
              )}
            >
              <Coins className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{balance}</span>
            </Badge>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{balance} créditos disponíveis</p>
          {isLow && <p className="text-destructive text-xs">Saldo baixo</p>}
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Coins className={cn("h-5 w-5", isLow ? "text-destructive" : "text-primary")} />
            <span className="text-2xl font-bold">{balance}</span>
          </div>
          <p className="text-xs text-muted-foreground">Créditos IA disponíveis</p>
        </div>

        <div className="p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Comprar créditos</p>
          {packagesLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : packages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum pacote disponível</p>
          ) : (
            packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => purchaseCredits.mutate(pkg.id)}
                disabled={purchaseCredits.isPending}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-accent hover:border-primary/30 transition-colors text-left disabled:opacity-50"
              >
                <div>
                  <p className="text-sm font-medium">{pkg.credits_amount} créditos</p>
                  {pkg.description && (
                    <p className="text-xs text-muted-foreground">{pkg.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-primary">
                    €{(pkg.price / 100).toFixed(2)}
                  </span>
                  <Zap className="h-3.5 w-3.5 text-primary" />
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
