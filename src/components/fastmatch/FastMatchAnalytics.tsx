import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Users, Handshake, Star, Clock } from "lucide-react";
import { useFastMatchInterests } from "@/hooks/useFastMatchInterests";
import { useFastMatchConnections } from "@/hooks/useFastMatchConnections";
import { useFastMatchQuota } from "@/hooks/useFastMatchQuota";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export function FastMatchAnalytics() {
  const { data: interests } = useFastMatchInterests();
  const { data: connections = [] } = useFastMatchConnections();
  const quota = useFastMatchQuota();

  const totalSent = interests?.sent?.length || 0;
  const totalReceived = interests?.received?.length || 0;
  const mutualCount = (interests?.sent?.filter(i => i.status === "mutual")?.length || 0) +
    (interests?.received?.filter(i => i.status === "mutual")?.length || 0);
  const mutualRate = totalSent > 0 ? Math.round((mutualCount / totalSent) * 100) : 0;

  const kpis = [
    { label: "Interesses Enviados", value: totalSent, icon: TrendingUp, color: "text-blue-500" },
    { label: "Interesses Recebidos", value: totalReceived, icon: Users, color: "text-violet-500" },
    { label: "Matches Mútuos", value: mutualCount, icon: Handshake, color: "text-emerald-500" },
    { label: "Conexões Ativas", value: connections.length, icon: Star, color: "text-amber-500" },
  ];

  // Build activity timeline from interests + connections
  const activities: { type: string; label: string; date: string }[] = [];
  interests?.sent?.forEach(i => activities.push({
    type: "sent",
    label: `Interesse enviado`,
    date: i.created_at,
  }));
  interests?.received?.forEach(i => activities.push({
    type: "received",
    label: `Interesse recebido`,
    date: i.created_at,
  }));
  connections.forEach(c => activities.push({
    type: "connection",
    label: `Conexão desbloqueada`,
    date: c.unlocked_at || c.created_at,
  }));
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
                <kpi.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion + Quota */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taxa de match mútuo</span>
              <span className="text-lg font-bold text-primary">{mutualRate}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${mutualRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {mutualCount} de {totalSent} interesses enviados resultaram em match mútuo
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Quota Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Utilização</span>
              <span className="text-lg font-bold text-foreground">{quota.used}/{quota.monthly}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${quota.monthly > 0 ? Math.min(100, (quota.used / quota.monthly) * 100) : 0}%`,
                  backgroundColor: quota.used >= quota.monthly ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{quota.remaining} restantes</span>
              {(quota.extraCredits ?? 0) > 0 && <span>+{quota.extraCredits} extra</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade registada.</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 10).map((activity, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    activity.type === "connection" ? "bg-emerald-500" :
                    activity.type === "sent" ? "bg-blue-500" : "bg-violet-500"
                  }`} />
                  <span className="text-foreground">{activity.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: pt })}
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
