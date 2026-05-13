import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Wallet } from "lucide-react";
import { formatEuro } from "@/utils/leadchef/commissions";

interface Props {
  sales: number;
  total: number;
  base: number;
  bonus: number;
  nextTier: number | null;
  salesToNextTier: number | null;
  extraToNextTier: number | null;
  currentTier: number;
}

export function GanhosKpis({
  sales,
  total,
  base,
  bonus,
  nextTier,
  salesToNextTier,
  extraToNextTier,
  currentTier,
}: Props) {
  const progressPct = nextTier && nextTier > 0 ? Math.min(100, (sales / nextTier) * 100) : 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide font-semibold">
          <TrendingUp className="h-4 w-4" />
          Vendas no mês
        </div>
        <div className="mt-2 text-3xl font-bold tabular-nums">{sales}</div>
        <div className="text-xs text-muted-foreground mt-1">
          Escalão atual: <span className="font-medium text-foreground">{currentTier || "—"}</span>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide font-semibold">
          <Wallet className="h-4 w-4" />
          Comissão estimada
        </div>
        <div className="mt-2 text-3xl font-bold tabular-nums text-emerald-600">
          {formatEuro(total)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Base {formatEuro(base)} · Bónus {formatEuro(bonus)}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide font-semibold">
          <Target className="h-4 w-4" />
          Próximo escalão
        </div>
        {nextTier !== null && salesToNextTier !== null && extraToNextTier !== null ? (
          <>
            <div className="mt-2 text-3xl font-bold tabular-nums">
              +{salesToNextTier} <span className="text-base font-medium text-muted-foreground">venda{salesToNextTier === 1 ? "" : "s"}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              → +{formatEuro(extraToNextTier)} (alvo: {nextTier} vendas)
            </div>
            <Progress value={progressPct} className="mt-3 h-1.5" />
          </>
        ) : (
          <>
            <div className="mt-2 text-3xl font-bold tabular-nums">🎉</div>
            <div className="text-xs text-muted-foreground mt-1">Topo da tabela atingido</div>
          </>
        )}
      </Card>
    </div>
  );
}
