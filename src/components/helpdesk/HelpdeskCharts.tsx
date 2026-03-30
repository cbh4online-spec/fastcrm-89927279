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
