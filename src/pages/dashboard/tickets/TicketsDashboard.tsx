import { useClientTicketStats } from "@/hooks/tickets/useClientTicketStats";
import { useClientTicketsAdmin } from "@/hooks/tickets/useClientTicketsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Headphones, Clock, CheckCircle, AlertTriangle, Star, TrendingUp, TicketCheck } from "lucide-react";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import TimeAgo from "react-timeago";
import { useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const PRIORITY_COLORS_CHART = { low: "#6b7280", medium: "#3b82f6", high: "#f97316", urgent: "#ef4444" };
const TYPE_LABELS: Record<string, string> = { support: "Suporte", commercial: "Comercial", technical: "Técnico" };

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  waiting_client: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  waiting_internal: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  resolved: "bg-green-500/15 text-green-400 border-green-500/30",
  closed: "bg-muted text-muted-foreground border-muted",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Progresso",
  waiting_client: "Aguarda Cliente",
  waiting_internal: "Aguarda Interno",
  resolved: "Resolvido",
  closed: "Fechado",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_BADGE_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/15 text-blue-400",
  high: "bg-orange-500/15 text-orange-400",
  urgent: "bg-red-500/15 text-red-400",
};

export default function TicketsDashboard() {
  const { data: stats, isLoading } = useClientTicketStats();
  const { data: recentTickets = [] } = useClientTicketsAdmin();
  const navigate = useNavigate();

  const latestTickets = recentTickets.slice(0, 5);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const pieData = Object.entries(stats.byPriority).map(([name, value]) => ({
    name: { low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" }[name] || name,
    value,
    color: PRIORITY_COLORS_CHART[name as keyof typeof PRIORITY_COLORS_CHART] || "#6b7280",
  }));

  const barData = Object.entries(stats.byType).map(([name, value]) => ({
    name: TYPE_LABELS[name] || name,
    tickets: value,
  }));

  const formatMinutes = (mins: number | null) => {
    if (mins == null) return "—";
    if (mins < 60) return `${Math.round(mins)}m`;
    return `${Math.round(mins / 60)}h`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Headphones className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Tickets</h1>
          <p className="text-sm text-muted-foreground">Visão geral do suporte ao cliente</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard icon={Headphones} label="Total de Tickets" value={stats.totalCount} color="text-foreground" />
        <KPICard icon={TicketCheck} label="Tickets Abertos" value={stats.openCount} color="text-blue-400" />
        <KPICard icon={Clock} label="Tempo Médio 1ª Resp." value={formatMinutes(stats.avgFirstResponseMinutes)} isText color="text-amber-400" />
        <KPICard icon={CheckCircle} label="Tempo Médio Resolução" value={formatMinutes(stats.avgResolutionMinutes)} isText color="text-green-400" />
        <KPICard icon={AlertTriangle} label="SLA Cumprimento" value={Math.round((1 - stats.slaBreachRate) * 100)} suffix="%" color="text-orange-400" />
        <KPICard icon={Star} label="Satisfação Média" value={stats.avgSatisfaction ? Number(stats.avgSatisfaction.toFixed(1)) : null} suffix="/5" isText={stats.avgSatisfaction == null} color="text-purple-400" />
      </div>

      {/* Charts + Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Distribuição por Prioridade</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem dados</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Volume por Tipo</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem dados</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Tickets Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum ticket ainda</p>
            ) : (
              latestTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/dashboard/tickets/${ticket.id}`)}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ticket.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[ticket.status] || ""}`}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </Badge>
                      <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_BADGE_COLORS[ticket.priority] || ""}`}>
                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
                    <TimeAgo date={ticket.created_at} />
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

function KPICard({ icon: Icon, label, value, suffix, color, isText }: {
  icon: any;
  label: string;
  value: any;
  suffix?: string;
  color?: string;
  isText?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {value == null ? "—" : isText ? String(value) : (
            <>
              <CountUp end={Number(value)} duration={1.5} decimals={String(value).includes(".") ? 1 : 0} />
              {suffix && <span className="text-sm text-muted-foreground ml-0.5">{suffix}</span>}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
