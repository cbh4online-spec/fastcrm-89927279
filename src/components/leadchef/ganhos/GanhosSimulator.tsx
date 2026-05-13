import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { calcCommission, formatEuro } from "@/utils/leadchef/commissions";

interface Props {
  currentSales: number;
}

export function GanhosSimulator({ currentSales }: Props) {
  const [value, setValue] = useState<string>(String(Math.max(currentSales, 1)));
  const sales = Math.max(0, Math.floor(Number(value) || 0));
  const sim = calcCommission(sales);
  const current = calcCommission(currentSales);
  const delta = sim.total - current.total;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Simulador de comissão</h3>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="sim-sales" className="text-xs">
            Se eu fechar
          </Label>
          <Input
            id="sim-sales"
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="flex gap-2">
          {[5, 10, 15, 20].map((n) => (
            <Button
              key={n}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue(String(n))}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Vendas</div>
          <div className="font-semibold tabular-nums">{sim.sales}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Base</div>
          <div className="font-semibold tabular-nums">{formatEuro(sim.base)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Bónus</div>
          <div className="font-semibold tabular-nums">{formatEuro(sim.bonus)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="font-bold tabular-nums text-emerald-600">{formatEuro(sim.total)}</div>
        </div>
      </div>

      {currentSales > 0 && delta !== 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          {delta > 0 ? (
            <>
              Em relação ao mês atual ({currentSales} vendas): <span className="text-emerald-600 font-semibold">+{formatEuro(delta)}</span>
            </>
          ) : (
            <>
              Diferença vs mês atual: <span className="text-destructive font-semibold">{formatEuro(delta)}</span>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
