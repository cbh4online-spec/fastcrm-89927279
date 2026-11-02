import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export interface SeriesRow {
  document_type: string;
  serie: string;
  count: number;
  cancelled: number;
  gross_value: number;
  discount: number;
  net: number;
  tax: number;
  total: number;
}
export interface AuditAlert {
  kind: string;
  document_no: string | null;
  detail: string;
}

const DOC_LABELS: Record<string, string> = {
  FT: "Fatura", FR: "Fatura-recibo", FS: "Fatura simplificada", NC: "Nota de crédito",
  ND: "Nota de débito", GR: "Guia de remessa", GT: "Guia de transporte", GA: "Guia de movimentação",
  OR: "Orçamento", PF: "Fatura pró-forma", NE: "Nota de encomenda", FO: "Folha de obra", CM: "Consulta de mesa",
};
const ALERT_LABELS: Record<string, string> = {
  totals_mismatch: "Totais inconsistentes",
  negative_total: "Total negativo",
  out_of_period: "Fora do período",
  missing_number: "Sem número",
  duplicate_in_file: "Duplicado no ficheiro",
};

const eur = (n: number) => new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export function SafTSeriesSummary({ rows, alerts, existing }: { rows?: SeriesRow[]; alerts?: AuditAlert[]; existing?: number }) {
  if (!rows) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Este ficheiro foi analisado antes do resumo por série existir. Volte a analisar (Nova importação) para ver o detalhe.
      </Card>
    );
  }
  const tot = rows.reduce(
    (a, r) => ({ count: a.count + r.count, cancelled: a.cancelled + r.cancelled, gross_value: a.gross_value + r.gross_value,
      discount: a.discount + r.discount, net: a.net + r.net, tax: a.tax + r.tax, total: a.total + r.total }),
    { count: 0, cancelled: 0, gross_value: 0, discount: 0, net: 0, tax: 0, total: 0 },
  );
  const list = alerts ?? [];
  const byKind = list.reduce<Record<string, number>>((a, x) => ((a[x.kind] = (a[x.kind] ?? 0) + 1), a), {});

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold">Análise de documentos por série</h3>
          <p className="text-xs text-muted-foreground">Compare estes totais com o mapa do seu software antes de importar. Notas de crédito a negativo; anulados fora dos totais.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Série</th>
                <th className="text-left px-3 py-2">Documento</th>
                <th className="text-right px-3 py-2">Qtd.</th>
                <th className="text-right px-3 py-2">Valor bruto</th>
                <th className="text-right px-3 py-2">Desconto</th>
                <th className="text-right px-3 py-2">Total IVA</th>
                <th className="text-right px-3 py-2">Incidência</th>
                <th className="text-right px-3 py-2">Total documento</th>
                <th className="text-right px-3 py-2">Anulados</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={`${r.document_type}|${r.serie}`} className="border-t">
                  <td className="px-3 py-1.5 font-medium">{r.serie}</td>
                  <td className="px-3 py-1.5">{DOC_LABELS[r.document_type] ?? r.document_type} <span className="text-muted-foreground">({r.document_type})</span></td>
                  <td className="px-3 py-1.5 text-right">{r.count}</td>
                  <td className="px-3 py-1.5 text-right">{eur(r.gross_value)}</td>
                  <td className="px-3 py-1.5 text-right">{eur(r.discount)}</td>
                  <td className="px-3 py-1.5 text-right">{eur(r.tax)}</td>
                  <td className="px-3 py-1.5 text-right">{eur(r.net)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{eur(r.total)}</td>
                  <td className="px-3 py-1.5 text-right">{r.cancelled ? <Badge variant="outline">{r.cancelled}</Badge> : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="tabular-nums font-semibold border-t-2 bg-muted/30">
              <tr>
                <td className="px-3 py-2" colSpan={2}>Totais</td>
                <td className="px-3 py-2 text-right">{tot.count}</td>
                <td className="px-3 py-2 text-right">{eur(tot.gross_value)}</td>
                <td className="px-3 py-2 text-right">{eur(tot.discount)}</td>
                <td className="px-3 py-2 text-right">{eur(tot.tax)}</td>
                <td className="px-3 py-2 text-right">{eur(tot.net)}</td>
                <td className="px-3 py-2 text-right">{eur(tot.total)}</td>
                <td className="px-3 py-2 text-right">{tot.cancelled}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Verificação de potenciais erros</h3>
        {list.length === 0 ? (
          <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" /> Sem inconsistências detetadas nos documentos.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byKind).map(([k, n]) => (
                <Badge key={k} variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{ALERT_LABELS[k] ?? k}: {n}</Badge>
              ))}
            </div>
            <ul className="max-h-64 overflow-y-auto divide-y text-sm border rounded-md">
              {list.map((a, i) => (
                <li key={i} className="px-3 py-1.5 flex gap-3">
                  <span className="font-medium min-w-[140px]">{a.document_no ?? "—"}</span>
                  <span className="text-muted-foreground">{a.detail}</span>
                </li>
              ))}
            </ul>
            {list.length >= 200 && <p className="text-xs text-muted-foreground">A mostrar os primeiros 200 alertas.</p>}
          </>
        )}
        <ul className="text-sm text-muted-foreground space-y-1">
          {tot.cancelled > 0 && <li>• {tot.cancelled} documento(s) anulado(s) não contam para a receita.</li>}
          {(existing ?? 0) > 0 && <li>• {existing} documento(s) já existem no FastCRM e serão ignorados.</li>}
        </ul>
      </Card>
    </div>
  );
}
