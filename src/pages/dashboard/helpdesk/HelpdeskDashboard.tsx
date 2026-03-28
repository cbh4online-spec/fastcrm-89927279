import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Headphones, Clock, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { useHelpdeskTickets } from "@/hooks/useHelpdeskTickets";
import { SLATimer } from "@/components/helpdesk/SLATimer";
import { useNavigate } from "react-router-dom";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Progresso",
  waiting_client: "Aguarda Cliente",
  waiting_internal: "Aguarda Interno",
  on_hold: "Em Espera",
  resolved: "Resolvido",
  closed: "Fechado",
};

export default function HelpdeskDashboard() {
  const { tickets, isLoading, stats } = useHelpdeskTickets();
  const navigate = useNavigate();

  // Status distribution
  const statusCounts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Headphones className="h-6 w-6 text-primary" />
            Helpdesk
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão centralizada de tickets de suporte</p>
        </div>
        <Button onClick={() => navigate("/dashboard/helpdesk/tickets")} variant="outline" className="gap-1.5">
          Ver Tickets <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tickets Abertos</p>
                <p className="text-3xl font-bold">{stats.openCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Headphones className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Compliance</p>
                <p className="text-3xl font-bold">{stats.slaCompliance}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolvidos Hoje</p>
                <p className="text-3xl font-bold">{stats.resolvedToday}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Em Risco</p>
                <p className="text-3xl font-bold">{stats.slaBreached}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution + Urgent Unassigned */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribuição por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(statusCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem tickets</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm">{STATUS_LABELS[status] || status}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Urgent Unassigned */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Urgentes sem Agente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.urgentUnassigned.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum ticket urgente sem atribuição 🎉</p>
            ) : (
              <div className="space-y-2">
                {stats.urgentUnassigned.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 rounded-md bg-red-50 dark:bg-red-950/20 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                    onClick={() => navigate(`/dashboard/helpdesk/tickets/${t.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">#{t.ticket_number} {t.subject}</p>
                    </div>
                    {t.sla_deadline && <SLATimer deadline={t.sla_deadline} />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
