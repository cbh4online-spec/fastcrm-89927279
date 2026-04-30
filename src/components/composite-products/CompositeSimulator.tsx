import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, Save } from "lucide-react";
import {
  useCompositeComponents, useKitStock, calcFinalPrice, classifyMargin,
  useCreateSimulation, useCompositeSimulations,
  type CompositeProduct,
} from "@/hooks/useCompositeProducts";
import { formatMoneyEur } from "@/lib/money";
import { format } from "date-fns";

export function CompositeSimulator({ kit }: { kit: CompositeProduct }) {
  const { data: components = [] } = useCompositeComponents(kit.id);
  const { data: stock } = useKitStock(kit.id);
  const { data: sims = [] } = useCompositeSimulations(kit.id);
  const createSim = useCreateSimulation();
  const [qty, setQty] = useState(10);

  const sim = useMemo(() => {
    const totals = calcFinalPrice(kit, components);
    const totalCost = totals.totalCost * qty;
    const totalRevenue = totals.finalPrice * qty;
    const margin = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;
    const level = classifyMargin(marginPct, Number(kit.min_margin_pct ?? 0));

    const requiredStock = components.map((c) => ({ product_id: c.product_id, quantity_needed: c.quantity * qty }));
    const missing: any[] = [];
    if (stock?.missing_components) {
      for (const m of stock.missing_components) {
        const needed = m.needed_per_kit * qty;
        if (m.available < needed) {
          missing.push({ product_id: m.product_id, product_name: m.product_name, needed, available: m.available, shortage: needed - m.available });
        }
      }
    }
    const recommendation =
      level === "not_recommended" ? "Não vender — preço inferior ao custo." :
      level === "danger" ? "Margem abaixo do mínimo. Renegociar preço ou rever componentes." :
      missing.length > 0 ? "Comprar componentes em falta antes de aceitar a venda." :
      "Pronto para vender.";

    return { totalCost, totalRevenue, margin, marginPct, level, requiredStock, missing, recommendation };
  }, [kit, components, qty, stock]);

  const save = async () => {
    await createSim.mutateAsync({
      kit_id: kit.id,
      expected_quantity: qty,
      total_cost: Number(sim.totalCost.toFixed(2)),
      total_revenue: Number(sim.totalRevenue.toFixed(2)),
      margin_pct: Number(sim.marginPct.toFixed(2)),
      missing_components: sim.missing,
      required_stock: sim.requiredStock,
      margin_risk: sim.level,
      recommendation: sim.recommendation,
      inputs: { quantity: qty },
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Simulador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Quantidade prevista de venda</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <Stat label="Custo total" value={formatMoneyEur(sim.totalCost)} />
            <Stat label="Receita prevista" value={formatMoneyEur(sim.totalRevenue)} />
            <Stat label="Margem (€)" value={formatMoneyEur(sim.margin)} />
            <Stat label="Margem (%)" value={`${sim.marginPct.toFixed(1)}%`} />
          </div>
          {sim.missing.length > 0 && (
            <div className="p-3 rounded-md bg-destructive/5 border border-destructive/20">
              <p className="text-sm font-medium mb-1">{sim.missing.length} componente(s) em falta para esta quantidade</p>
              {sim.missing.map((m) => (
                <p key={m.product_id} className="text-xs text-muted-foreground">
                  {m.product_name}: faltam {m.shortage} unidades
                </p>
              ))}
            </div>
          )}
          <div className="p-3 rounded-md bg-muted/50">
            <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Recomendação</p>
            <p className="text-sm">{sim.recommendation}</p>
          </div>
          <Button onClick={save} disabled={createSim.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Guardar simulação
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico de simulações</CardTitle>
        </CardHeader>
        <CardContent>
          {sims.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem simulações guardadas</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {sims.map((s: any) => (
                <div key={s.id} className="p-2 border rounded-md text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{s.expected_quantity} unidades</span>
                    <span className="text-muted-foreground">{format(new Date(s.created_at), "dd/MM HH:mm")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Receita: {formatMoneyEur(Number(s.total_revenue || 0))}</span>
                    <span>Margem: {Number(s.margin_pct || 0).toFixed(1)}%</span>
                  </div>
                  {s.margin_risk && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{s.margin_risk}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}
