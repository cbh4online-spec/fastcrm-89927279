import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins } from "lucide-react";
import { useProductValuation } from "@/hooks/useInventoryValuation";
import { useCapability } from "@/hooks/useCapability";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);

interface Props {
  productId: string;
}

/**
 * Cartão de valorização FIFO para o detalhe de produto.
 * Mostra stock × custo médio FIFO × PVP × margem latente.
 * Restrito a utilizadores com capability `finance.view` (esconde custo/margem
 * para perfis comerciais como agentes/SDRs).
 */
export function ProductValuationCard({ productId }: Props) {
  const canViewCostMargin = useCapability("finance.view");
  const { valuation, isLoading } = useProductValuation(productId);

  if (!canViewCostMargin) return null;


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4" /> Valorização do stock (FIFO)
          </CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  if (!valuation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4" /> Valorização do stock (FIFO)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem dados de valorização para este produto.</p>
        </CardContent>
      </Card>
    );
  }

  const items = [
    { label: "Stock atual", value: `${Math.round(valuation.current_stock)} un.` },
    { label: "Custo médio FIFO", value: fmt(valuation.fifo_avg_cost) },
    { label: "Valor a custo", value: fmt(valuation.total_cost_value), strong: true },
    { label: "PVP unitário", value: fmt(valuation.unit_sale_price) },
    { label: "Valor a PVP", value: fmt(valuation.total_sale_value), strong: true },
    {
      label: "Margem latente",
      value: fmt(valuation.latent_margin),
      strong: true,
      accent: valuation.latent_margin < 0 ? "text-destructive" : "text-emerald-600",
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="h-4 w-4" /> Valorização do stock (FIFO)
        </CardTitle>
        <Badge variant={valuation.latent_margin_pct < 0 ? "destructive" : valuation.latent_margin_pct < 15 ? "secondary" : "default"}>
          {valuation.latent_margin_pct.toFixed(1)}% margem
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.label}>
              <div className="text-xs text-muted-foreground">{it.label}</div>
              <div className={`${it.strong ? "text-lg font-bold" : "text-sm"} ${it.accent || ""}`}>
                {it.value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
