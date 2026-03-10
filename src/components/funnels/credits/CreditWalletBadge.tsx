import { Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCreditWallet } from "@/hooks/useCreditWallet";

export function CreditWalletBadge() {
  const { balance, walletLoading } = useCreditWallet();

  if (walletLoading) {
    return (
      <Badge variant="outline" className="gap-1.5 animate-pulse">
        <Coins className="h-3.5 w-3.5" />
        <span className="text-xs">...</span>
      </Badge>
    );
  }

  const isLow = balance <= 10;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gap-1.5 cursor-default transition-colors ${
              isLow
                ? "border-destructive/50 text-destructive"
                : "border-primary/30 text-primary"
            }`}
          >
            <Coins className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">{balance}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">créditos</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{balance} créditos disponíveis</p>
          {isLow && <p className="text-destructive text-xs">Saldo baixo — considere comprar mais</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
