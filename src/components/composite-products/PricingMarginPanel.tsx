import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ShieldCheck, TrendingDown, ShoppingCart } from "lucide-react";
import {
  useCompositeComponents, useKitStock, calcFinalPrice, classifyMargin,
  type CompositeProduct, type MarginGuardLevel,
} from "@/hooks/useCompositeProducts";
import { formatMoneyEur } from "@/lib/money";

const guardConfig: Record<MarginGuardLevel, { label: string; className: string; icon: any }> = {
  safe: { label: "Margem segura", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", icon: ShieldCheck },
  attention: { label: "Atenção", className: "bg-amber-500/15 text-amber-700 border-amber-500/30", icon: AlertTriangle },
  danger: { label: "Margem perigosa", className: "bg-red-500/15 text-red-700 border-red-500/30", icon: TrendingDown },
  not_recommended: { label: "Não recomendado", className: "bg-red-600/20 text-red-800 border-red-600/40", icon: TrendingDown },
};

export function PricingMarginPanel({ kit }: { kit: CompositeProduct }) {
  const { data: components = [] } = useCompositeComponents(kit.id);
  const { data: stock } = useKitStock(kit.id);

  const totals = useMemo(() => calcFinalPrice(kit, components), [kit, components]);
  const level = useMemo(() => classifyMargin(totals.marginPct, Number(kit.min_margin_pct ?? 0)), [totals, kit]);
  const guard = guardConfig[level];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Pricing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Preço & Margem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Custo total" value={formatMoneyEur(totals.totalCost)} />
          <Row label="Soma componentes" value={formatMoneyEur(totals.totalPrice)} muted />
          <Row label="Preço final" value={formatMoneyEur(totals.finalPrice)} highlight />
          <Row label="Margem (€)" value={formatMoneyEur(totals.margin)} />
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Margem (%)</span>
              <span className="font-medium">{totals.marginPct.toFixed(1)}%</span>
            </div>
            <Progress value={Math.max(0, Math.min(100, totals.marginPct))} className="h-2" />
            <p className="text-xs text-muted-foreground">Mínimo definido: {Number(kit.min_margin_pct ?? 0).toFixed(1)}%</p>
          </div>
          <div className="pt-2 border-t">
            <Badge variant="outline" className={`${guard.className} gap-1`}>
              <guard.icon className="h-3 w-3" />
              {guard.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stock virtual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Stock Virtual do Kit
            {stock && (
              <Badge variant={stock.available_units > 0 ? "default" : "destructive"}>
                {stock.available_units} unid.
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!stock ? (
            <p className="text-sm text-muted-foreground">A calcular stock...</p>
          ) : (
            <>
              {stock.limiting_component && (
                <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-700 dark:text-amber-400 uppercase font-medium">Componente limitador</p>
                  <p className="text-sm font-medium mt-1">{stock.limiting_component.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {stock.limiting_component.available} disponíveis × {stock.limiting_component.needed_per_kit} necessários por kit
                  </p>
                </div>
              )}
              {stock.missing_components && stock.missing_components.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-medium">Componentes em falta</p>
                  </div>
                  {stock.missing_components.map((m) => (
                    <div key={m.product_id} className="flex items-center justify-between text-sm p-2 rounded bg-destructive/5 border border-destructive/20">
                      <div>
                        <p className="font-medium">{m.product_name}</p>
                        <p className="text-xs text-muted-foreground">Necessários: {m.needed_per_kit} • Disponíveis: {m.available}</p>
                      </div>
                      <Badge variant="destructive">Faltam {m.shortage}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">Todos os componentes têm stock suficiente.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, highlight, muted }: { label: string; value: string; highlight?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "text-lg font-semibold" : muted ? "text-muted-foreground" : "font-medium"}>{value}</span>
    </div>
  );
}
