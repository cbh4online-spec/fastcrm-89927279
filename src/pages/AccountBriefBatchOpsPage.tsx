import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountBriefAccounts } from "@/hooks/useAccountBriefAccounts";
import { useAccountBriefBatchOps } from "@/hooks/useAccountBriefBatchOps";
import { useAccountBriefUsage } from "@/hooks/useAccountBriefUsage";
import { Loader2, Play, Square, RefreshCw, Eye, EyeOff, Users, Archive, Layers, Mail, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const BATCH_TYPES = [
  { value: "reanalyze", label: "Reanalisar", icon: RefreshCw },
  { value: "add_watchlist", label: "Adicionar à Watchlist", icon: Eye },
  { value: "remove_watchlist", label: "Remover da Watchlist", icon: EyeOff },
  { value: "change_status", label: "Mudar estado comercial", icon: Users },
  { value: "archive", label: "Arquivar", icon: Archive },
  { value: "add_segment", label: "Adicionar a segmento", icon: Layers },
  { value: "generate_outreach", label: "Gerar outreach", icon: Mail },
  { value: "export_pdf", label: "Exportar PDF", icon: FileText },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  queued: { label: "Em fila", color: "bg-muted text-muted-foreground", icon: Clock },
  running: { label: "A executar", color: "bg-blue-500/20 text-blue-500", icon: Loader2 },
  completed: { label: "Concluído", color: "bg-emerald-500/20 text-emerald-500", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "bg-destructive/20 text-destructive", icon: AlertCircle },
  partial: { label: "Parcial", color: "bg-amber-500/20 text-amber-500", icon: AlertCircle },
};

export default function AccountBriefBatchOpsPage() {
  const { accounts, isLoading: accountsLoading } = useAccountBriefAccounts({});
  const { batchRuns, isLoading: batchLoading, startBatch } = useAccountBriefBatchOps();
  const { checkQuota } = useAccountBriefUsage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchType, setBatchType] = useState("");

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === accounts.length) setSelected(new Set());
    else setSelected(new Set(accounts.map(a => a.id)));
  };

  const handleBatch = async () => {
    if (!batchType || selected.size === 0) return;
    const quota = checkQuota("batch_actions_month");
    if (!quota.allowed) {
      toast.error("Limite de ações batch atingido. Considere fazer upgrade.");
      return;
    }
    try {
      await startBatch.mutateAsync({ batchType, accountIds: Array.from(selected) });
      toast.success(`Batch "${batchType}" iniciado para ${selected.size} contas`);
      setSelected(new Set());
      setBatchType("");
    } catch {
      toast.error("Erro ao iniciar batch");
    }
  };

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader title="Operações em Lote" description="Executar ações em múltiplas contas simultaneamente" />

          {/* Action bar */}
          <Card className="border-0 shadow-lg">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">{selected.size} selecionadas</Badge>
                <Select value={batchType} onValueChange={setBatchType}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Ação batch..." /></SelectTrigger>
                  <SelectContent>
                    {BATCH_TYPES.map(bt => (
                      <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleBatch} disabled={!batchType || selected.size === 0 || startBatch.isPending} className="gap-2">
                  {startBatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Executar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account selection */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Selecionar Contas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {accountsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2.5 w-10">
                        <Checkbox checked={selected.size === accounts.length && accounts.length > 0} onCheckedChange={toggleAll} />
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Empresa</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Domínio</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(acc => (
                      <tr key={acc.id} className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer", selected.has(acc.id) && "bg-primary/5")} onClick={() => toggleSelect(acc.id)}>
                        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selected.has(acc.id)} onCheckedChange={() => toggleSelect(acc.id)} />
                        </td>
                        <td className="px-4 py-2.5 font-medium">{acc.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{acc.domain}</td>
                        <td className="px-4 py-2.5 text-center">
                          {acc.total_score > 0 ? <Badge variant="secondary" className="text-xs">{acc.total_score}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Batch runs history */}
          {batchRuns.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader><CardTitle className="text-base">Histórico de operações</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {batchRuns.map(run => {
                    const st = STATUS_MAP[run.status] || STATUS_MAP.queued;
                    const StIcon = st.icon;
                    const pct = run.total_items > 0 ? Math.round((run.processed_items / run.total_items) * 100) : 0;
                    return (
                      <div key={run.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                        <StIcon className={cn("w-4 h-4 shrink-0", run.status === "running" && "animate-spin")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">{run.batch_type}</span>
                            <Badge className={cn("text-[10px]", st.color)}>{st.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground">{run.processed_items}/{run.total_items}</span>
                            {run.failed_items > 0 && <span className="text-xs text-destructive">{run.failed_items} falhas</span>}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{format(new Date(run.created_at), "dd/MM HH:mm")}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
