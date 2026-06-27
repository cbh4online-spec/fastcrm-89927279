import { IXCard } from "@/components/entity/ix/IXCard";
import { TrendingUp, Users, Handshake, Star, Clock } from "lucide-react";
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
  const mutualCount =
    (interests?.sent?.filter((i) => i.status === "mutual")?.length || 0) +
    (interests?.received?.filter((i) => i.status === "mutual")?.length || 0);
  const mutualRate = totalSent > 0 ? Math.round((mutualCount / totalSent) * 100) : 0;

  const kpis = [
    { label: "Interesses Enviados", value: totalSent, icon: TrendingUp },
    { label: "Interesses Recebidos", value: totalReceived, icon: Users },
    { label: "Matches Mútuos", value: mutualCount, icon: Handshake },
    { label: "Conexões Ativas", value: connections.length, icon: Star },
  ];

  const activities: { type: string; label: string; date: string }[] = [];
  interests?.sent?.forEach((i) => activities.push({ type: "sent", label: "Interesse enviado", date: i.created_at }));
  interests?.received?.forEach((i) =>
    activities.push({ type: "received", label: "Interesse recebido", date: i.created_at })
  );
  connections.forEach((c) =>
    activities.push({ type: "connection", label: "Conexão desbloqueada", date: c.unlocked_at || c.created_at })
  );
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const quotaPct = quota.monthly > 0 ? Math.min(100, (quota.used / quota.monthly) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* KPIs planos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Conversion + Quota */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IXCard title="Taxa de conversão" description="Interesses que resultaram em match mútuo">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Taxa de match mútuo</span>
            <span className="text-lg font-bold tabular-nums text-foreground">{mutualRate}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${mutualRate}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {mutualCount} de {totalSent} interesses enviados resultaram em match mútuo
          </p>
        </IXCard>

        <IXCard title="Quota mensal" description="Utilização de matches este mês">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Utilização</span>
            <span className="text-lg font-bold tabular-nums text-foreground">
              {quota.used}/{quota.monthly}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${quotaPct}%`,
                backgroundColor:
                  quota.used >= quota.monthly ? "hsl(var(--destructive))" : "hsl(var(--primary))",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span>{quota.remaining} restantes</span>
            {(quota.extraCredits ?? 0) > 0 && <span>+{quota.extraCredits} extra</span>}
          </div>
        </IXCard>
      </div>

      {/* Atividade Recente */}
      <IXCard
        title="Atividade recente"
        description="Últimos interesses e conexões"
        actions={<Clock className="h-4 w-4 text-muted-foreground" />}
      >
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade registada.</p>
        ) : (
          <div className="divide-y divide-border -mx-6">
            {activities.slice(0, 10).map((activity, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-2.5 text-sm">
                <div
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    activity.type === "connection"
                      ? "bg-emerald-500"
                      : activity.type === "sent"
                      ? "bg-blue-500"
                      : "bg-violet-500"
                  }`}
                />
                <span className="text-foreground">{activity.label}</span>
                <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                  {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: pt })}
                </span>
              </div>
            ))}
          </div>
        )}
      </IXCard>
    </div>
  );
}
