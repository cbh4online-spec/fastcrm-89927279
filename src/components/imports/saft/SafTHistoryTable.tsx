import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, Loader2 } from "lucide-react";
import { useSaftImports, useAnalyzeSaft } from "@/hooks/imports/useSaftImport";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

const statusLabel: Record<string, string> = {
  completed: "Concluído",
  failed: "Falhado",
  cancelled: "Cancelado",
  preview_ready: "Pré-visualização",
  importing: "A importar",
  analyzing: "A analisar",
  uploaded: "Carregado",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  failed: "destructive",
  cancelled: "destructive",
  preview_ready: "secondary",
  importing: "secondary",
  analyzing: "secondary",
  uploaded: "outline",
};

function isStuck(r: { status: string; started_at: string | null; updated_at?: string; created_at: string }) {
  if (!["analyzing", "importing"].includes(r.status)) return false;
  const ref = r.started_at || r.updated_at || r.created_at;
  return Date.now() - new Date(ref).getTime() > 5 * 60 * 1000;
}

export function SafTHistoryTable({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: list = [], isLoading } = useSaftImports();
  const analyze = useAnalyzeSaft();
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">A carregar…</p>;
  if (!list.length) return <p className="text-sm text-muted-foreground">Sem importações ainda.</p>;

  const handleRetry = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Clear previous error and reset status before re-queuing, so the UI
    // does not keep showing the stale failure while the new run starts.
    const { error: resetErr } = await (supabase as any)
      .from("saft_imports")
      .update({ status: "uploaded", error_message: null, started_at: null })
      .eq("id", id);
    if (resetErr) {
      toast.error("Não foi possível limpar o erro anterior: " + resetErr.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["saft-imports"] });
    analyze.mutate(id, {
      onSuccess: () => toast.success("Importação recolocada em fila"),
      onError: (err: any) => toast.error("Falha ao recolocar: " + (err?.message ?? "erro")),
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Eliminar este registo de importação? Esta acção é irreversível.")) return;
    setDeletingId(id);
    const { error } = await (supabase as any).from("saft_imports").delete().eq("id", id);
    setDeletingId(null);
    if (error) { toast.error("Erro ao eliminar: " + error.message); return; }
    qc.invalidateQueries({ queryKey: ["saft-imports"] });
    toast.success("Importação eliminada");
  };

  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground text-xs">
          <tr>
            <th className="text-left p-3">Ficheiro</th>
            <th className="text-left p-3">Tipo</th>
            <th className="text-left p-3">Período</th>
            <th className="text-left p-3">Faturas</th>
            <th className="text-left p-3">Estado</th>
            <th className="text-left p-3">Data</th>
            <th className="text-right p-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => {
            const stuck = isStuck(r);
            const canRetry = r.status === "failed" || stuck;
            return (
              <tr
                key={r.id}
                onClick={() => onSelect(r.id)}
                className="border-t cursor-pointer hover:bg-muted/40"
              >
                <td className="p-3 font-medium">
                  <div>{r.file_name}</div>
                  {r.error_message && (
                    <div className="text-xs text-destructive mt-1 max-w-md truncate" title={r.error_message}>
                      {r.error_message}
                    </div>
                  )}
                </td>
                <td className="p-3">{r.saft_type ?? "—"}</td>
                <td className="p-3">
                  {r.period_start ? `${r.period_start} → ${r.period_end}` : "—"}
                </td>
                <td className="p-3">{r.stats?.invoices ?? "—"}</td>
                <td className="p-3">
                  <Badge variant={statusVariant[r.status] ?? "outline"}>
                    {statusLabel[r.status] ?? r.status}
                    {stuck && " (preso)"}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-PT")}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canRetry && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleRetry(e, r.id)}
                        disabled={analyze.isPending}
                        title="Repetir análise"
                      >
                        {analyze.isPending && analyze.variables === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDelete(e, r.id)}
                      disabled={deletingId === r.id}
                      title="Eliminar"
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
