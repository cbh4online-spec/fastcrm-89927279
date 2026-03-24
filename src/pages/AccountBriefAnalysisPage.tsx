import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountBriefAnalysisRuns } from "@/hooks/useAccountBriefAnalysisRuns";
import { Loader2, Activity, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";

const RUN_STATUS: Record<string, { label: string; color: string }> = {
  queued: { label: "Em fila", color: "bg-muted text-muted-foreground" },
  processing: { label: "A processar", color: "bg-blue-500/20 text-blue-500" },
  completed: { label: "Concluída", color: "bg-emerald-500/20 text-emerald-500" },
  partial: { label: "Parcial", color: "bg-amber-500/20 text-amber-500" },
  failed: { label: "Falhou", color: "bg-destructive/20 text-destructive" },
};

export default function AccountBriefAnalysisPage() {
  const { runs, isLoading, triggerAnalysis } = useAccountBriefAnalysisRuns();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = statusFilter === "all" ? runs : runs.filter((r: any) => r.status === statusFilter);

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            title="Estado das Análises"
            description="Monitorização operacional das análises de contas"
          />

          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                <SelectItem value="queued">Em fila</SelectItem>
                <SelectItem value="processing">A processar</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Activity className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">Sem análises</h3>
                <p className="text-sm text-muted-foreground">As análises aparecerão aqui quando forem executadas.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Descobertas</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Processadas</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Falharam</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Duração</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((run: any) => {
                    const s = RUN_STATUS[run.status] || RUN_STATUS.queued;
                    return (
                      <tr key={run.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          {run.created_at ? format(new Date(run.created_at), "dd/MM/yyyy HH:mm") : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={cn("text-xs", s.color)}>{s.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">{run.pages_discovered ?? 0}</td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">{run.pages_processed ?? 0}</td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          {(run.pages_failed ?? 0) > 0 ? <span className="text-destructive">{run.pages_failed}</span> : "0"}
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">
                          {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(run.status === "failed" || run.status === "partial") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => triggerAnalysis.mutate(run.account_id)}
                              disabled={triggerAnalysis.isPending}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
