import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Truck, UserPlus } from "lucide-react";
import {
  POST_SALE_VISIT_FEE,
  POST_SALE_VISIT_WINDOW_DAYS,
  RECRUITMENT_BONUS_ENTRY,
  RECRUITMENT_BONUS_2ND_SALE,
  formatEuro,
} from "@/utils/leadchef/commissions";

export function ExtrasCard() {
  const [visits, setVisits] = useState<string>("0");
  const visitsN = Math.max(0, Math.floor(Number(visits) || 0));
  const visitsTotal = visitsN * POST_SALE_VISIT_FEE;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Visitas pós-venda</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {formatEuro(POST_SALE_VISIT_FEE)} fixos por cada visita realizada dentro de{" "}
          {POST_SALE_VISIT_WINDOW_DAYS} dias após a venda.
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="visits-n" className="text-xs">
              Nº de visitas
            </Label>
            <Input
              id="visits-n"
              type="number"
              min={0}
              value={visits}
              onChange={(e) => setVisits(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-xl font-bold tabular-nums text-emerald-600">
              {formatEuro(visitsTotal)}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Prémio de recrutamento</h3>
        </div>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <span>
              Embaixador no programa <em>Ganhar</em>:{" "}
              <span className="font-semibold">{formatEuro(RECRUITMENT_BONUS_ENTRY)}</span> à entrada do processo.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <span>
              Embaixador com máquina própria:{" "}
              <span className="font-semibold">{formatEuro(RECRUITMENT_BONUS_2ND_SALE)}</span> à entrega da 2.ª venda do embaixador (data a definir).
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
