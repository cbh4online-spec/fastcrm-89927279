import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import type { SupportTicket } from "@/hooks/useHelpdeskTickets";
import { format, subDays, startOfDay, isAfter } from "date-fns";
import { pt } from "date-fns/locale";
import { useMemo } from "react";

const CHANNEL_COLORS: Record<string, string> = {
  email: "hsl(var(--primary))",
  phone: "hsl(220, 70%, 55%)",
  portal: "hsl(160, 60%, 45%)",
  chat: "hsl(280, 60%, 55%)",
  manual: "hsl(var(--muted-foreground))",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Telefone",
  portal: "Portal",
  chat: "Chat",
  manual: "Manual",
};

interface HelpdeskChartsProps {
  tickets: SupportTicket[];
}

export function TicketTrendChart({ tickets }: HelpdeskChartsProps) {
  const trendData = useMemo(() => {
    const days = 14;
    const data: { date: string; label: string; abertos: number; resolvidos: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const dayStr = format(day, "yyyy-MM-dd");
      const label = format(day, "dd/MM", { locale: pt });
      const abertos = tickets.filter(
        (t) => t.created_at.slice(0, 10) === dayStr
      ).length;
      const resolvidos = tickets.filter(
        (t) => t.resolved_at && t.resolved_at.slice(0, 10) === dayStr
      ).length;
      data.push({ date: dayStr, label, abertos, resolvidos });
    }
    return data;
  }, [tickets]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Tendência — Abertos vs Resolvidos (14 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gAbertos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gResolvidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="abertos"
                name="Abertos"
                stroke="hsl(var(--primary))"
                fill="url(#gAbertos)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="resolvidos"
                name="Resolvidos"
                stroke="hsl(160, 60%, 45%)"
                fill="url(#gResolvidos)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function TicketsByChannelChart({ tickets }: HelpdeskChartsProps) {
  const channelData = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach((t) => {
      counts[t.channel] = (counts[t.channel] || 0) + 1;
    });
    return Object.entries(counts).map(([channel, count]) => ({
      name: CHANNEL_LABELS[channel] || channel,
      value: count,
      color: CHANNEL_COLORS[channel] || "hsl(var(--muted-foreground))",
    }));
  }, [tickets]);

  if (channelData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tickets por Canal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Tickets por Canal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] flex items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={channelData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {channelData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface AgentWorkloadProps {
  tickets: SupportTicket[];
  profiles?: { id: string; full_name: string | null; avatar_url: string | null }[];
}

export function AgentWorkloadChart({ tickets, profiles = [] }: AgentWorkloadProps) {
  const workloadData = useMemo(() => {
    const activeTickets = tickets.filter(
      (t) => !["resolved", "closed"].includes(t.status)
    );
    const counts: Record<string, number> = {};
    activeTickets.forEach((t) => {
      if (t.assigned_to) {
        counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([userId, count]) => {
        const profile = profiles.find((p) => p.id === userId);
        return {
          name: profile?.full_name || userId.slice(0, 8),
          tickets: count,
        };
      })
      .sort((a, b) => b.tickets - a.tickets)
      .slice(0, 8);
  }, [tickets, profiles]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Carga por Agente</CardTitle>
      </CardHeader>
      <CardContent>
        {workloadData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Sem tickets atribuídos
          </p>
        ) : (
          <div className="space-y-2">
            {workloadData.map((agent) => (
              <div key={agent.name} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{agent.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{agent.tickets}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted mt-1">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, (agent.tickets / Math.max(...workloadData.map((a) => a.tickets))) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}h`);

export function VolumeHeatmap({ tickets }: HelpdeskChartsProps) {
  const heatmapData = useMemo(() => {
    // Create 7x24 matrix (day x hour)
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    tickets.forEach((t) => {
      const d = new Date(t.created_at);
      matrix[d.getDay()][d.getHours()]++;
    });
    let maxVal = 0;
    matrix.forEach(row => row.forEach(v => { if (v > maxVal) maxVal = v; }));
    return { matrix, maxVal };
  }, [tickets]);

  const getColor = (value: number) => {
    if (value === 0) return "bg-muted";
    const intensity = heatmapData.maxVal > 0 ? value / heatmapData.maxVal : 0;
    if (intensity > 0.75) return "bg-primary";
    if (intensity > 0.5) return "bg-primary/70";
    if (intensity > 0.25) return "bg-primary/40";
    return "bg-primary/20";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Heatmap de Volume (dia × hora)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Hour labels */}
            <div className="flex ml-10 mb-1">
              {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                <span
                  key={h}
                  className="text-[9px] text-muted-foreground"
                  style={{ position: "relative", left: `${(h / 24) * 100}%`, width: 0 }}
                >
                  {h}h
                </span>
              ))}
            </div>
            {/* Rows */}
            {heatmapData.matrix.map((row, dayIdx) => (
              <div key={dayIdx} className="flex items-center gap-1 mb-0.5">
                <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">
                  {DAYS[dayIdx]}
                </span>
                <div className="flex gap-[2px] flex-1">
                  {row.map((val, hourIdx) => (
                    <div
                      key={hourIdx}
                      className={`h-3 flex-1 rounded-[2px] transition-colors ${getColor(val)}`}
                      title={`${DAYS[dayIdx]} ${hourIdx}h: ${val} tickets`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SLAByDepartmentChart({ tickets }: HelpdeskChartsProps) {
  const data = useMemo(() => {
    const deptMap: Record<string, { total: number; breached: number; avgResolution: number; resolvedCount: number }> = {};
    tickets.forEach((t) => {
      const dept = t.department || "Sem Dept.";
      if (!deptMap[dept]) deptMap[dept] = { total: 0, breached: 0, avgResolution: 0, resolvedCount: 0 };
      deptMap[dept].total++;
      if (t.sla_deadline && !["resolved", "closed"].includes(t.status) && new Date(t.sla_deadline) < new Date()) {
        deptMap[dept].breached++;
      }
      if (t.resolved_at) {
        const resMs = new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime();
        deptMap[dept].avgResolution += resMs / (1000 * 60 * 60);
        deptMap[dept].resolvedCount++;
      }
    });

    return Object.entries(deptMap).map(([dept, v]) => ({
      name: dept,
      compliance: v.total > 0 ? Math.round(((v.total - v.breached) / v.total) * 100) : 100,
      mttr: v.resolvedCount > 0 ? Math.round((v.avgResolution / v.resolvedCount) * 10) / 10 : 0,
      total: v.total,
    })).sort((a, b) => b.total - a.total);
  }, [tickets]);

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">SLA por Departamento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip
                formatter={(v: number) => [`${v}%`, "SLA Compliance"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="compliance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
