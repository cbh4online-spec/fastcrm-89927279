import { Button } from "@/components/ui/button";
import { ArrowUpRight, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradeBannerProps {
  className?: string;
}

export function UpgradeBanner({ className }: UpgradeBannerProps) {
  const navigate = useNavigate();

  return (
    <div className={`flex items-center justify-between rounded-lg border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/30 px-4 py-3 ${className || ""}`}>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">Quota mensal atingida</p>
        <p className="text-xs text-muted-foreground">
          Atualize o seu plano ou adquira créditos extra para continuar.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard/settings/billing")}
          className="gap-1.5 text-xs"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Atualizar Plano
        </Button>
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => navigate("/dashboard/settings/billing")}
        >
          <Coins className="w-3.5 h-3.5" />
          Comprar Créditos
        </Button>
      </div>
    </div>
  );
}
