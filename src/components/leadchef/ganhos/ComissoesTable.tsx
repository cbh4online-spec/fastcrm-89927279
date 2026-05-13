import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { COMMISSION_TABLE, formatEuro } from "@/utils/leadchef/commissions";
import { cn } from "@/lib/utils";

interface Props {
  highlightSales?: number;
}

export function ComissoesTable({ highlightSales = 0 }: Props) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="font-semibold text-sm uppercase tracking-wide">Tabela de Comissões Agentes</h3>
        <Badge variant="outline" className="text-[10px]">Oficial</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
              <th className="text-left px-4 py-2 font-medium">N.º Vendas</th>
              <th className="text-right px-4 py-2 font-medium">Comissão Base</th>
              <th className="text-right px-4 py-2 font-medium">Bónus</th>
              <th className="text-right px-4 py-2 font-medium">Total Comissão</th>
            </tr>
          </thead>
          <tbody>
            {COMMISSION_TABLE.map((row, idx) => {
              const isCurrent = highlightSales > 0 && row.sales === highlightSales;
              return (
                <tr
                  key={row.sales}
                  className={cn(
                    "border-t transition-colors",
                    idx % 2 === 1 && !isCurrent && "bg-muted/20",
                    isCurrent && "bg-emerald-50 dark:bg-emerald-950/30 font-semibold"
                  )}
                >
                  <td className="px-4 py-2 tabular-nums">
                    {row.sales}
                    {isCurrent && (
                      <Badge className="ml-2 bg-emerald-600 hover:bg-emerald-600 text-[10px]">Atual</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatEuro(row.base)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.bonus > 0 ? formatEuro(row.bonus) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatEuro(row.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground space-y-1">
        <p>• Os valores estão sujeitos aos impostos em vigor.</p>
        <p>• Tabela baseada em 135€ por venda (base) + bónus por escalão.</p>
      </div>
    </Card>
  );
}
