import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useSaftImportItems } from "@/hooks/imports/useSaftImport";
import type { SaftImport } from "@/hooks/imports/useSaftImport";

const actionVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  created: "default",
  updated: "secondary",
  skipped_duplicate: "outline",
  merged: "secondary",
  failed: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  uploaded: "Carregado",
  analyzing: "A analisar",
  preview_ready: "Pré-visualização pronta",
  importing: "A importar",
  completed: "Concluída",
  failed: "Falhou",
  cancelled: "Cancelada",
};

export function SafTProgressPanel({ imp }: { imp: SaftImport }) {
  const isLive = imp.status === "importing" || imp.status === "analyzing";
  const { data: items = [] } = useSaftImportItems(imp.id, isLive);

  const s = imp.stats ?? {};
  const summary = (s.summary ?? {}) as Record<string, Record<string, number>>;

  // Total esperado = clientes + produtos + faturas + pagamentos detectados na análise
  const expectedRaw =
    (s.customers ?? 0) +
    (s.products ?? 0) +
    (s.new_invoices ?? s.invoices ?? 0) +
    (s.payments ?? 0);

  // Pagamentos órfãos: referenciam faturas anuladas ou fora do período exportado.
  // Não são erro — são impossíveis de importar e devem ser excluídos do denominador.
  const orphanPayments = Number(summary?.payment?.skipped ?? 0);
  const expected = Math.max(0, expectedRaw - orphanPayments);

  // Total realmente processado: soma do summary excluindo "skipped" (já descontado do esperado).
  const summaryProcessed = Object.entries(summary).reduce((acc, [entity, counts]) => {
    return acc + Object.entries(counts ?? {}).reduce((a, [action, b]) => {
      if (entity === "payment" && action === "skipped") return a;
      return a + (Number(b) || 0);
    }, 0);
  }, 0);
  const processed = summaryProcessed > 0 ? summaryProcessed : items.length;

  const isCompleted = imp.status === "completed";
  const isFailed = imp.status === "failed";
  const partial = isCompleted && expected > 0 && processed > 0 && processed < expected * 0.95;

  let pct = 0;
  if (isCompleted && !partial) pct = 100;
  else if (expected > 0) pct = Math.min(99, Math.round((processed / expected) * 100));
  else if (isLive) pct = 5;

  const statusLabel = partial ? "Concluída (parcial)" : (STATUS_LABEL[imp.status] ?? imp.status);

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isLive && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {isCompleted && !partial && <CheckCircle2 className="h-4 w-4 text-primary" />}
            {(isFailed || partial) && <AlertCircle className={`h-4 w-4 ${partial ? "text-amber-500" : "text-destructive"}`} />}
            <p className="font-semibold">{statusLabel}</p>
          </div>
          <span className="text-sm font-mono text-muted-foreground">
            {processed}{expected > 0 ? ` / ${expected}` : ""} · {pct}%
          </span>
        </div>

        <Progress value={pct} className="h-2" />

        {isCompleted && orphanPayments > 0 && (
          <div className="rounded-md border border-muted bg-muted/30 p-3 text-sm">
            <p className="font-medium">
              {orphanPayments} pagamento{orphanPayments === 1 ? "" : "s"} não importado{orphanPayments === 1 ? "" : "s"}
            </p>
            <p className="text-muted-foreground mt-1">
              Estes pagamentos referenciam faturas anuladas ou fora do período exportado no SAF-T, pelo que não têm fatura correspondente para associar. Não é um erro — é o comportamento esperado.
            </p>
          </div>
        )}

        {partial && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">Importação terminada com menos registos do que o previsto</p>
            <p className="text-muted-foreground mt-1">
              Foram processados {processed} de {expected} registos esperados. Isto pode dever-se a duplicados ignorados, limites de execução ou erros parciais. Verifica os "Últimos registos" abaixo e o histórico para detalhes.
            </p>
          </div>
        )}

        {imp.error_message && (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-1">
            <p className="text-sm text-destructive font-medium">
              {imp.last_error_step ? `Falhou em "${imp.last_error_step}"` : "Falhou"}
            </p>
            <p className="text-sm text-destructive">{imp.error_message}</p>
            {imp.last_step_at && (
              <p className="text-xs text-muted-foreground">Último passo: {imp.last_step ?? "—"} · {new Date(imp.last_step_at).toLocaleString("pt-PT")}</p>
            )}
            {imp.debug_log && imp.debug_log.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                  Ver trace de execução ({imp.debug_log.length} passos)
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/40 p-2 text-xs font-mono whitespace-pre-wrap">
                  {imp.debug_log.map((e: any, i: number) =>
                    `${String(i + 1).padStart(2, "0")}. [${e.elapsed_ms ?? 0}ms · rss=${e.rss_mb ?? "?"}MB · heap=${e.heap_mb ?? "?"}MB] ${e.step}${
                      Object.keys(e).filter(k => !["step","ts","elapsed_ms","rss_mb","heap_mb"].includes(k)).length
                        ? " " + JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => !["step","ts","elapsed_ms","rss_mb","heap_mb"].includes(k))))
                        : ""
                    }`
                  ).join("\n")}
                </pre>
              </details>
            )}
          </div>
        )}

        {isLive && (
          <p className="text-xs text-muted-foreground">
            A processar registos em segundo plano. Esta janela actualiza automaticamente.
          </p>
        )}

        {Object.keys(summary).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {Object.entries(summary).map(([entity, counts]: any) => (
              <div key={entity} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground capitalize">{entity}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(counts).map(([action, count]: any) => (
                    <Badge key={action} variant={actionVariant[action] ?? "outline"}>
                      {action.replace("_", " ")}: {count as number}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <p className="font-medium mb-2">
          Últimos registos{" "}
          <span className="text-sm text-muted-foreground font-normal">
            (amostra de {items.length}{processed > items.length ? ` de ${processed} processados` : ""})
          </span>
        </p>
        <div className="max-h-96 overflow-auto text-sm">
          <table className="w-full">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="text-left p-2">Tipo</th>
                <th className="text-left p-2">Chave</th>
                <th className="text-left p-2">Acção</th>
                <th className="text-left p-2">Erro</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 100).map((it: any) => (
                <tr key={it.id} className="border-b">
                  <td className="p-2">{it.entity_type}</td>
                  <td className="p-2 font-mono text-xs">{it.source_key}</td>
                  <td className="p-2">
                    <Badge variant={actionVariant[it.action] ?? "outline"}>{it.action}</Badge>
                  </td>
                  <td className="p-2 text-destructive text-xs">{it.error_message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
