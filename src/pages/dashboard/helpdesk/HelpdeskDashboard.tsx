import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Headphones, Clock, CheckCircle, AlertTriangle, ArrowRight,
  Timer, Zap, TrendingUp,
} from "lucide-react";
import { useHelpdeskTickets } from "@/hooks/useHelpdeskTickets";
import { SLATimer } from "@/components/helpdesk/SLATimer";
import {
  TicketTrendChart,
  TicketsByChannelChart,
  AgentWorkloadChart,
} from "@/components/helpdesk/HelpdeskCharts";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import TimeAgo from "react-timeago";

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Progresso",
  waiting_client: "Aguarda Cliente",
  waiting_internal: "Aguarda Interno",
  on_hold: "Em Espera",
  resolved: "Resolvido",
  closed: "Fechado",
};

const STATUS_DOT: Record<string, string> = {
  open: "bg-blue-500",
  in_progress: "bg-purple-500",
  waiting_client: "bg-yellow-500",
  waiting_internal: "bg-orange-500",
  on_hold: "bg-gray-400",
  resolved: "bg-green-500",
  closed: "bg-muted-foreground",
};

export default function HelpdeskDashboard() {
  const { tickets, isLoading, stats } = useHelpdeskTickets();
  const navigate = useNavigate();

  // Advanced metrics
  const advancedMetrics = useMemo(() => {
    const resolvedTickets = tickets.filter((t) => t.resolved_at);

    // Average Resolution Time (MTTR) in hours
    const mttrHours = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          const created = new Date(t.created_at).getTime();
          const resolved = new Date(t.resolved_at!).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60);
        }, 0) / resolvedTickets.length
      : 0;

    // Average First Response Time (FRT) in hours
    const frtTickets = tickets.filter((t) => t.first_response_at);
    const frtHours = frtTickets.length > 0
      ? frtTickets.reduce((sum, t) => {
          const created = new Date(t.created_at).getTime();
          const responded = new Date(t.first_response_at!).getTime();
          return sum + (responded - created) / (1000 * 60 * 60);
        }, 0) / frtTickets.length
      : 0;

    // Unassigned tickets
    const unassigned = tickets.filter(
      (t) => !t.assigned_to && !["resolved", "closed"].includes(t.status)
    ).length;

    return { mttrHours, frtHours, unassigned };
  }, [tickets]);

  // Status distribution
  const statusCounts = useMemo(() => {
    return tickets.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tickets]);

  // Recent tickets
  const recentTickets = useMemo(() => {
    return tickets.slice(0, 8);
  }, [tickets]);

  const formatHours = (h: number) => {
    if (h < 1) return `${Math.round(h * 60)}m`;
    if (h < 24) return `${h.toFixed(1)}h`;
    return `${(h / 24).toFixed(1)}d`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[280px] rounded-lg" />
          <Skeleton className="h-[280px] rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Headphones className="h-6 w-6 text-primary" />
            Helpdesk
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão centralizada de tickets de suporte
          </p>
        </div>
        <Button
          onClick={() => navigate("/dashboard/helpdesk/tickets")}
          variant="outline"
          className="gap-1.5"
        >
          Ver Tickets <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Headphones className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats.openCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tickets Abertos</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Clock className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats.slaCompliance}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">SLA Compliance</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats.resolvedToday}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Resolvidos Hoje</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <Timer className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatHours(advancedMetrics.frtHours)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tempo Médio 1ª Resposta</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-violet-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatHours(advancedMetrics.mttrHours)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">MTTR (Resolução)</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-9 w-9 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats.slaBreached}</p>
            <p className="text-xs text-muted-foreground mt-0.5">SLA Em Risco</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TicketTrendChart tickets={tickets} />
        <TicketsByChannelChart tickets={tickets} />
      </div>

      {/* Bottom Row: Status + Agent Workload + Urgent + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(statusCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem tickets</p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const total = tickets.length;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${STATUS_DOT[status] || "bg-muted"}`} />
                          <span className="text-xs">{STATUS_LABELS[status] || status}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${STATUS_DOT[status] || "bg-muted-foreground"} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Workload */}
        <AgentWorkloadChart tickets={tickets} />

        {/* Urgent Unassigned */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Urgentes sem Agente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.urgentUnassigned.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum ticket urgente sem atribuição 🎉
              </p>
            ) : (
              <div className="space-y-2">
                {stats.urgentUnassigned.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 rounded-md bg-red-50 dark:bg-red-950/20 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                    onClick={() => navigate(`/dashboard/helpdesk/tickets/${t.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        #{t.ticket_number} {t.subject}
                      </p>
                    </div>
                    {t.sla_deadline && <SLATimer deadline={t.sla_deadline} />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Tickets Recentes</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => navigate("/dashboard/helpdesk/tickets")}
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem tickets</p>
          ) : (
            <div className="space-y-1">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/dashboard/helpdesk/tickets/${ticket.id}`)}
                >
                  <span className="text-[10px] font-mono text-muted-foreground w-12 shrink-0">
                    #{ticket.ticket_number}
                  </span>
                  <div className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[ticket.status] || "bg-muted"}`} />
                  <span className="text-sm truncate flex-1">{ticket.subject}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 shrink-0 capitalize"
                  >
                    {ticket.priority}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    <TimeAgo date={ticket.created_at} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
