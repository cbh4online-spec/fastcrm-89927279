import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { usePricingRules, getMarginStatus, calculateMinPrice } from "@/hooks/useProductPricingIntelligence";

interface MarginProtectionCardProps {
  price: number | null | undefined;
  cost: number | null | undefined;
  category?: string | null;
}

export function MarginProtectionCard({ price, cost, category }: MarginProtectionCardProps) {
  const { data: rules = [] } = usePricingRules();

  const { status, minMargin, currentMargin } = getMarginStatus(price, cost, rules, category);
  const minPrice = cost ? calculateMinPrice(cost, minMargin) : null;

  const statusConfig = {
    healthy: {
      icon: ShieldCheck,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      label: "Margem Saudável",
      badgeVariant: "default" as const,
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      label: "Margem Baixa",
      badgeVariant: "secondary" as const,
    },
    danger: {
      icon: ShieldX,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      label: "Abaixo do Custo",
      badgeVariant: "destructive" as const,
    },
    unknown: {
      icon: ShieldAlert,
      color: "text-muted-foreground",
      bg: "bg-muted/50",
      border: "border-muted",
      label: "Sem Dados",
      badgeVariant: "outline" as const,
    },
  };

  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <Card className={`${cfg.border} border`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${cfg.color}`} />
            Proteção de Margem
          </span>
          <Badge variant={cfg.badgeVariant} className="text-[10px]">
            {cfg.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-lg ${cfg.bg} p-2.5`}>
            <p className="text-[10px] text-muted-foreground uppercase">Margem Atual</p>
            <p className={`text-lg font-bold ${cfg.color}`}>
              {currentMargin !== null ? `${currentMargin.toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase">Margem Mínima</p>
            <p className="text-lg font-bold">{minMargin}%</p>
          </div>
        </div>

        {minPrice && status !== "healthy" && (
          <div className="rounded-lg border border-dashed border-primary/30 p-2.5">
            <p className="text-[10px] text-muted-foreground">Preço Mínimo Recomendado</p>
            <p className="text-sm font-bold text-primary">
              {minPrice.toFixed(2)} €
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Custo ({cost?.toFixed(2)} €) + Margem mín. ({minMargin}%)
            </p>
          </div>
        )}

        {status === "danger" && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-[10px] text-destructive">
              Este produto está a ser vendido abaixo do preço de custo. Ajuste o preço de venda para evitar prejuízo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
