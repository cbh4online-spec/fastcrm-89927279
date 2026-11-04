import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { sourceLabel, stepRate } from "@/lib/bgi/alertRules";
import type { BgiPeriod } from "@/hooks/useBgiIndicators";

interface Row { source: string; leads: number; converted: number; opportunities: number; won: number; invoiced_net: number }
type SortKey = keyof Omit<Row, "source">;

const COLS: { key: SortKey; label: string }[] = [
  { key: "leads", label: "Leads" }, { key: "converted", label: "Convertidas" }, { key: "opportunities", label: "Oportunidades" },
  { key: "won", label: "Ganhas" }, { key: "invoiced_net", label: "Faturado (s/ IVA)" },
];
const eur = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
const rate = (n: number, d: number) => { const r = stepRate(n, d); return r === null ? "—" : `${r.toLocaleString("pt-PT")}%`; };

export function BgiSourceFunnel({ period, anchor }: { period: BgiPeriod; anchor: string | null }) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const [sort, setSort] = useState<SortKey>("leads");
  const q = useQuery({
    queryKey: ["bgi-funnel-source", wsId, period, anchor],
    enabled: !!wsId, staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("bgi_funnel_by_source", { _workspace_id: wsId!, _period: period, ...(anchor ? { _anchor: anchor } : {}) });
      if (error) throw error;
      return ((data as any)?.rows ?? []) as Row[];
    },
  });
  const rows = useMemo(() => [...(q.data ?? [])].sort((a, b) => Number(b[sort]) - Number(a[sort])), [q.data, sort]);

  return (
    <IXCard title="Funil origem → venda">
      {q.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />}
      {q.error && <p className="text-sm text-destructive">Não foi possível calcular o funil: {(q.error as Error).message}</p>}
      {q.data && rows.length === 0 && <p className="text-sm text-muted-foreground">Sem leads novas neste período.</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Origem</TableHead>
              {COLS.map((c) => (
                <TableHead key={c.key} className="text-right" aria-sort={sort === c.key ? "descending" : "none"}>
                  <button type="button" className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded" onClick={() => setSort(c.key)}>{c.label}</button>
                </TableHead>
              ))}
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.source}>
                  <TableCell className="font-medium whitespace-nowrap">{sourceLabel(r.source)}</TableCell>
                  <TableCell className="text-right">{r.leads}</TableCell>
                  <TableCell className="text-right">{r.converted} <span className="text-xs text-muted-foreground">({rate(r.converted, r.leads)})</span></TableCell>
                  <TableCell className="text-right">{r.opportunities} <span className="text-xs text-muted-foreground">({rate(r.opportunities, r.leads)})</span></TableCell>
                  <TableCell className="text-right">{r.won} <span className="text-xs text-muted-foreground">({rate(r.won, r.opportunities)})</span></TableCell>
                  <TableCell className="text-right whitespace-nowrap">{eur(Number(r.invoiced_net))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">Leads criadas no período, seguidas até à venda. Faturado conta só faturas ligadas a essas leads.</p>
        </div>
      )}
    </IXCard>
  );
}
