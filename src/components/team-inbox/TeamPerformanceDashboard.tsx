import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAgentPerformance,
  useTeamInboxSummary,
  type AgentPerformanceRow,
} from "@/hooks/useTeamPerformance";
import {
  Users,
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";

function formatSeconds(s: number | null | undefined): string {
  if (!s || s <= 0) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  return `${(s / 3600).toFixed(1)} h`;
}

function workloadBadge(status: string) {
  if (status === "overloaded")
    return <Badge variant="destructive" className="text-[10px]">Sobrecarregado</Badge>;
  if (status === "balanced")
    return <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500">Equilibrado</Badge>;
  if (status === "available")
    return <Badge className="text-[10px] bg-emerald-500 hover:bg-emerald-500">Disponível</Badge>;
  return <Badge variant="outline" className="text-[10px]">—</Badge>;
}

function progressColor(pct: number): string {
  if (pct > 85) return "bg-destructive";
  if (pct >= 50) return "bg-amber-500";
  return "bg-emerald-500";
}

export function TeamPerformanceDashboard() {
  const { data: summary, isLoading: sLoading } = useTeamInboxSummary();
  const { data: agents, isLoading: aLoading } = useAgentPerformance();

  const overloaded = (agents || []).filter((a) => a.workload_status === "overloaded").length;

  return (
    <div className="space-y-6">
      {/* Executive summary banner */}
      <Card className="p-4 bg-gradient-to-br from-primary/5 via-background to-background border-l-4 border-l-primary">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">Resumo operacional de hoje</h3>
            {sLoading ? (
              <p className="text-xs text-muted-foreground">A carregar…</p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                A equipa tem{" "}
                <span className="font-medium text-foreground">{summary?.open_conversations ?? 0}</span> conversas abertas.{" "}
                <span className="font-medium text-foreground">{summary?.unassigned_conversations ?? 0}</span>{" "}
                estão sem responsável. Tempo médio de primeira resposta:{" "}
                <span className="font-medium text-foreground">
                  {formatSeconds(summary?.avg_first_response_seconds_today)}
                </span>
                . {overloaded > 0 && (
                  <>
                    <span className="font-medium text-destructive">{overloaded}</span> agente(s) sobrecarregado(s).
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          icon={<Inbox className="h-4 w-4" />}
          label="Conversas abertas"
          value={String(summary?.open_conversations ?? 0)}
          tone="default"
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Sem responsável"
          value={String(summary?.unassigned_conversations ?? 0)}
          tone={summary && summary.unassigned_conversations > 0 ? "warning" : "default"}
          hint="risco de perda comercial"
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Urgentes"
          value={String(summary?.urgent_conversations ?? 0)}
          tone={summary && summary.urgent_conversations > 0 ? "danger" : "default"}
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="Tempo 1ª resposta"
          value={formatSeconds(summary?.avg_first_response_seconds_today)}
          hint="média de hoje"
        />
      </div>

      {/* Stale / resolved row */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="Sem resposta há +30 min"
          value={String(summary?.stale_inbound ?? 0)}
          tone={summary && summary.stale_inbound > 0 ? "warning" : "default"}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Resolvidas hoje"
          value={String(summary?.resolved_today ?? 0)}
          tone="success"
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Agentes ativos"
          value={String((agents || []).length)}
        />
      </div>

      {/* Agents table */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Performance da equipa</h3>
            <p className="text-xs text-muted-foreground">
              Identifique gargalos, distribua conversas e acompanhe a qualidade operacional da equipa.
            </p>
          </div>
        </div>

        {aLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !agents || agents.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Sem agentes registados ainda. Convide membros ou crie perfis em Configurações.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agente</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Resolv. 7d</TableHead>
                  <TableHead className="text-right">1ª resposta</TableHead>
                  <TableHead className="text-right">SLA atrasados</TableHead>
                  <TableHead className="text-right">Follow-ups</TableHead>
                  <TableHead className="text-right">Produtos</TableHead>
                  <TableHead className="min-w-[140px]">Carga</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a: AgentPerformanceRow) => (
                  <TableRow key={a.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={a.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(a.full_name || a.email || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {a.full_name || a.email || "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground capitalize">
                            {a.role_type ?? "agente"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.open_conversations}
                      {a.urgent_open > 0 && (
                        <span className="text-[10px] text-destructive ml-1">({a.urgent_open}!)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{a.open_tickets}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.conversations_resolved_7d + a.tickets_resolved_7d}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {formatSeconds(a.avg_first_response_seconds_7d)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.overdue_tickets > 0 ? (
                        <span className="text-destructive font-medium">{a.overdue_tickets}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.pending_followups}
                      {a.overdue_followups > 0 && (
                        <span className="text-[10px] text-destructive ml-1">({a.overdue_followups}!)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{a.products_shared_7d}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full transition-all ${progressColor(a.workload_pct)}`}
                            style={{ width: `${Math.min(100, a.workload_pct)}%` }}
                          />
                        </div>
                        <span className="text-[11px] tabular-nums w-9 text-right">{a.workload_pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{workloadBadge(a.workload_status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-3">
          Score experimental baseado em sinais operacionais. Deve ser usado como apoio à gestão, não como avaliação isolada.
        </p>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClasses =
    tone === "warning"
      ? "border-amber-500/40 bg-amber-500/5"
      : tone === "danger"
      ? "border-destructive/40 bg-destructive/5"
      : tone === "success"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : "";
  return (
    <Card className={`p-4 ${toneClasses}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}
