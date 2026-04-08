import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Clock, Users, TrendingUp, ThumbsUp, ThumbsDown, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { format, parseISO, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{d.date}</p>
      <p className="text-primary">Conversas: {d.count}</p>
    </div>
  );
}

export function ChatAnalyticsTab() {
  const { currentWorkspace } = useWorkspace();

  const { data: conversations = [] } = useQuery({
    queryKey: ["chat_analytics", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("id, created_at, status, session_id, visitor_name, messages:chat_messages(id, role, created_at)")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const metrics = useMemo(() => {
    const total = conversations.length;
    const resolved = conversations.filter((c: any) => c.status === "resolved" || c.status === "closed").length;
    const open = conversations.filter((c: any) => c.status === "open").length;

    let totalResponseTime = 0;
    let responseCount = 0;
    let totalMessages = 0;

    for (const conv of conversations) {
      const messages = (conv as any).messages || [];
      totalMessages += messages.length;
      const sorted = [...messages].sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));

      const firstUser = sorted.find((m: any) => m.role === "user");
      const firstAssistant = sorted.find((m: any) => m.role === "assistant" && firstUser && m.created_at > firstUser.created_at);

      if (firstUser && firstAssistant) {
        const diff = new Date(firstAssistant.created_at).getTime() - new Date(firstUser.created_at).getTime();
        totalResponseTime += diff;
        responseCount++;
      }
    }

    const avgResponseMs = responseCount > 0 ? totalResponseTime / responseCount : 0;
    const avgResponseSec = Math.round(avgResponseMs / 1000);
    const avgMessages = total > 0 ? Math.round(totalMessages / total) : 0;

    // Volume by hour
    const byHour: Record<number, number> = {};
    for (const conv of conversations) {
      const hour = new Date((conv as any).created_at).getHours();
      byHour[hour] = (byHour[hour] || 0) + 1;
    }
    const hourlyData = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}h`,
      count: byHour[h] || 0,
    }));

    const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];

    // Daily trend (last 30 days)
    const now = new Date();
    const from = subDays(now, 30);
    const days = eachDayOfInterval({ start: startOfDay(from), end: startOfDay(now) });
    const dailyData = days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const count = conversations.filter((c: any) => c.created_at.startsWith(dayStr)).length;
      return {
        date: format(day, "dd MMM", { locale: pt }),
        rawDate: dayStr,
        count,
      };
    });

    return {
      total,
      resolved,
      open,
      resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
      avgResponseSec,
      avgMessages,
      peakHour: peakHour ? `${peakHour[0]}h` : "—",
      peakHourCount: peakHour ? peakHour[1] : 0,
      hourlyData,
      dailyData,
    };
  }, [conversations]);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> Total
            </p>
            <p className="text-2xl font-bold">{metrics.total}</p>
            <p className="text-[10px] text-muted-foreground">{metrics.open} abertas</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Users className="h-3 w-3" /> Resolução
            </p>
            <p className="text-2xl font-bold">{metrics.resolutionRate.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">{metrics.resolved} resolvidas</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3 w-3" /> Tempo Resp.
            </p>
            <p className="text-2xl font-bold">{metrics.avgResponseSec}s</p>
            <p className="text-[10px] text-muted-foreground">média 1ª resposta</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Msgs/Conv
            </p>
            <p className="text-2xl font-bold">{metrics.avgMessages}</p>
            <p className="text-[10px] text-muted-foreground">média mensagens</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Pico
            </p>
            <p className="text-2xl font-bold">{metrics.peakHour}</p>
            <p className="text-[10px] text-muted-foreground">{metrics.peakHourCount} conversas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily volume chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Volume Diário (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={metrics.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.15)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Hourly distribution */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  interval={2}
                />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={25} />
                <Tooltip />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {metrics.hourlyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.hour === metrics.peakHour
                        ? "hsl(var(--primary))"
                        : "hsl(var(--primary) / 0.3)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {conversations.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              Sem conversas de chat registadas ainda.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
