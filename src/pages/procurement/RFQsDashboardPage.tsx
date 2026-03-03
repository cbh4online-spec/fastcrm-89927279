import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRFQs } from "@/hooks/useRFQ";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { KPICard } from "@/components/kpis/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoading } from "@/components/design-system/LoadingState";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { FileText, Clock, AlertTriangle, CheckCircle, ArrowRight, BarChart3 } from "lucide-react";
import { differenceInDays, parseISO, isPast, format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

type UrgencyLevel = "expired" | "critical" | "warning" | "safe";

function getUrgency(dueDate: string | null, status: string): UrgencyLevel {
  if (!dueDate) return "safe";
  if (["awarded", "closed"].includes(status)) return "safe";
  const days = differenceInDays(parseISO(dueDate), new Date());
  if (days < 0) return "expired";
  if (days <= 3) return "critical";
  if (days <= 7) return "warning";
  return "safe";
}

const urgencyConfig: Record<UrgencyLevel, { label: string; dotClass: string; badgeVariant: "destructive" | "default" | "secondary" | "outline"; rowClass: string }> = {
  expired: { label: "Expirado", dotClass: "bg-destructive animate-pulse", badgeVariant: "destructive", rowClass: "bg-destructive/5" },
  critical: { label: "≤3 dias", dotClass: "bg-orange-500", badgeVariant: "default", rowClass: "bg-orange-500/5" },
  warning: { label: "≤7 dias", dotClass: "bg-amber-500", badgeVariant: "secondary", rowClass: "bg-amber-500/5" },
  safe: { label: ">7 dias", dotClass: "bg-green-500", badgeVariant: "outline", rowClass: "" },
};

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(var(--muted-foreground))",
  sent: "hsl(var(--primary))",
  quoting: "hsl(210, 80%, 55%)",
  awarded: "hsl(142, 71%, 45%)",
  closed: "hsl(var(--muted-foreground))",
  cancelled: "hsl(var(--destructive))",
};

export default function RFQsDashboardPage() {
  const { t } = useTranslation("procurement");
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { data: rfqs, isLoading } = useRFQs(currentWorkspace?.id);

  const stats = useMemo(() => {
    if (!rfqs) return { active: 0, totalQuotes: 0, expired: 0, expiringSoon: 0, byStatus: [] as { name: string; value: number; color: string }[], urgent: [] as any[], timeline: [] as any[] };

    const active = rfqs.filter((r: any) => !["closed", "cancelled"].includes(r.status));
    const expired = active.filter((r: any) => r.due_date && isPast(parseISO(r.due_date)) && !["awarded"].includes(r.status));
    const expiringSoon = active.filter((r: any) => {
      if (!r.due_date) return false;
      const days = differenceInDays(parseISO(r.due_date), new Date());
      return days >= 0 && days <= 7;
    });

    // Status distribution
    const statusCounts: Record<string, number> = {};
    rfqs.forEach((r: any) => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
    const byStatus = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: STATUS_COLORS[name] || "hsl(var(--muted-foreground))",
    }));

    // Timeline: all active with due_date, sorted by due_date
    const timeline = active
      .filter((r: any) => r.due_date)
      .map((r: any) => ({ ...r, urgency: getUrgency(r.due_date, r.status) }))
      .sort((a: any, b: any) => parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime());

    // Top 10 urgent
    const urgent = timeline.filter((r: any) => r.urgency !== "safe").slice(0, 10);

    return { active: active.length, totalQuotes: rfqs.length, expired: expired.length, expiringSoon: expiringSoon.length, byStatus, urgent, timeline };
  }, [rfqs]);

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard RFQs</h1>
          <p className="text-sm text-muted-foreground">Resumo de pedidos de cotação e deadlines</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard/procurement/rfqs")}>
          Ver Todos <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="RFQs Ativas" value={stats.active} icon={<FileText className="h-4 w-4" />} />
        <KPICard label="Total RFQs" value={stats.totalQuotes} icon={<BarChart3 className="h-4 w-4" />} />
        <KPICard label="Expiradas" value={stats.expired} icon={<AlertTriangle className="h-4 w-4" />} highlight={stats.expired > 0} />
        <KPICard label="A Expirar (7 dias)" value={stats.expiringSoon} icon={<Clock className="h-4 w-4" />} highlight={stats.expiringSoon > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={stats.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {stats.byStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Deadline Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Timeline de Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sem RFQs com deadline definido</p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                {stats.timeline.map((rfq: any) => {
                  const cfg = urgencyConfig[rfq.urgency as UrgencyLevel];
                  const days = differenceInDays(parseISO(rfq.due_date), new Date());
                  return (
                    <div
                      key={rfq.id}
                      className={cn("flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors", cfg.rowClass)}
                      onClick={() => navigate(`/dashboard/procurement/rfqs/${rfq.id}`)}
                    >
                      <div className={cn("h-3 w-3 rounded-full shrink-0", cfg.dotClass)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{rfq.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {rfq.rfq_number} · {format(parseISO(rfq.due_date), "dd MMM yyyy", { locale: pt })}
                        </p>
                      </div>
                      <Badge variant={cfg.badgeVariant} className="shrink-0 text-xs">
                        {days < 0 ? `${Math.abs(days)}d atrasado` : days === 0 ? "Hoje" : `${days}d restantes`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Urgent RFQs Table */}
      {stats.urgent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              RFQs Urgentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº RFQ</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.urgent.map((rfq: any) => {
                  const cfg = urgencyConfig[rfq.urgency as UrgencyLevel];
                  const days = differenceInDays(parseISO(rfq.due_date), new Date());
                  return (
                    <TableRow key={rfq.id} className={cfg.rowClass}>
                      <TableCell className="font-mono text-sm">{rfq.rfq_number || "—"}</TableCell>
                      <TableCell className="font-medium">{rfq.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rfq.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{format(parseISO(rfq.due_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2.5 w-2.5 rounded-full", cfg.dotClass)} />
                          <span className="text-xs">{cfg.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/procurement/rfqs/${rfq.id}`)}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
