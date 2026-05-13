import { Card } from "@/components/ui/card";
import { CheckCircle2, Truck, UserPlus, Sparkles } from "lucide-react";
import {
  POST_SALE_VISIT_FEE,
  POST_SALE_VISIT_WINDOW_DAYS,
  RECRUITMENT_BONUS_ENTRY,
  RECRUITMENT_BONUS_2ND_SALE,
  formatEuro,
} from "@/utils/leadchef/commissions";

interface Props {
  postSaleVisits: number;
  visitsTotal: number;
  recruitmentEntries: number;
  recruitmentTotal: number;
  secondSaleBonus: number;
  extrasTotal: number;
}

export function ExtrasCard({
  postSaleVisits,
  visitsTotal,
  recruitmentEntries,
  recruitmentTotal,
  secondSaleBonus,
  extrasTotal,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Extras calculados automaticamente a partir das tuas atividades do mês.
      </div>

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
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Visitas concluídas no mês</div>
              <div className="text-2xl font-semibold tabular-nums">{postSaleVisits}</div>
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
          <ul className="space-y-2 text-sm mb-3">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>
                Embaixador no programa <em>Ganhar</em>:{" "}
                <span className="font-semibold">{formatEuro(RECRUITMENT_BONUS_ENTRY)}</span> à entrada.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>
                Máquina própria:{" "}
                <span className="font-semibold">{formatEuro(RECRUITMENT_BONUS_2ND_SALE)}</span> à 2.ª venda do embaixador.
              </span>
            </li>
          </ul>
          <div className="flex items-end justify-between gap-3 border-t pt-3">
            <div>
              <div className="text-xs text-muted-foreground">Recrutamentos no mês</div>
              <div className="text-2xl font-semibold tabular-nums">{recruitmentEntries}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total estimado</div>
              <div className="text-xl font-bold tabular-nums text-emerald-600">
                {formatEuro(recruitmentTotal + secondSaleBonus)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-emerald-50/50 border-emerald-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Total de extras do mês</div>
            <div className="text-xs text-muted-foreground/80">
              Visitas pós-venda + recrutamento + 2.ª venda
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-emerald-700">
            {formatEuro(extrasTotal)}
          </div>
        </div>
      </Card>
    </div>
  );
}
