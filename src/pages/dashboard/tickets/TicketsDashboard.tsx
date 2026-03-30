import { useClientTicketStats } from "@/hooks/tickets/useClientTicketStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Headphones, Clock, CheckCircle, AlertTriangle, Star, TrendingUp } from "lucide-react";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const PRIORITY_COLORS_CHART = { low: "#6b7280", medium: "#3b82f6", high: "#f97316", urgent: "#ef4444" };
const TYPE_LABELS: Record<string, string> = { support: "Suporte", commercial: "Comercial", technical: "Técnico" };

export default function TicketsDashboard() {
  const { data: stats, isLoading } = useClientTicketStats();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard icon={Headphones} label="Tickets Abertos" value={stats.openCount} color="text-blue-400" />
        <KPICard icon={Clock} label="Tempo Médio 1ª Resposta" value={formatMinutes(stats.avgFirstResponseMinutes)} isText color="text-amber-400" />
        <KPICard icon={CheckCircle} label="Tempo Médio Resolução" value={formatMinutes(stats.avgResolutionMinutes)} isText color="text-green-400" />
        <KPICard icon={AlertTriangle} label="SLA Cumprimento" value={Math.round((1 - stats.slaBreachRate) * 100)} suffix="%" color="text-orange-400" />
        <KPICard icon={Star} label="Satisfação Média" value={stats.avgSatisfaction ? Number(stats.avgSatisfaction.toFixed(1)) : null} suffix="/5" isText={stats.avgSatisfaction == null} color="text-purple-400" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
