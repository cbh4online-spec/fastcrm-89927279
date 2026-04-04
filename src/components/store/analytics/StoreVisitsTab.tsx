import { memo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "./KPICard";
import { fadeIn } from "./AnalyticsChartHelpers";
import { Eye, Users, Clock, MousePointerClick, Monitor, Smartphone, Tablet, Globe, ArrowUpDown, ArrowDown, LogOut } from "lucide-react";
import { useStoreVisitsAnalytics } from "@/hooks/useStoreVisitsAnalytics";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from "recharts";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";

const DEVICE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
];

const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function VisitsTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{format(parseISO(d.date), "dd MMM yyyy", { locale: pt })}</p>
      <p className="text-primary font-semibold">Views: {d.views}</p>
      <p className="text-warning font-medium">Sessões: {d.sessions}</p>
    </div>
  );
}

interface StoreVisitsTabProps {
  days: number;
}

export const StoreVisitsTab = memo(function StoreVisitsTab({ days }: StoreVisitsTabProps) {
  const {
    kpis, dailyVisits, deviceBreakdown, trafficSources,
    topPages, referrers, aiIntents, isLoading,
  } = useStoreVisitsAnalytics(days);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <motion.div {...fadeIn} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Total Views" value={String(kpis.totalViews)} icon={Eye} />
        <KPICard title="Sessões" value={String(kpis.uniqueSessions)} icon={Users} />
        <KPICard title="Págs/Sessão" value={kpis.pagesPerSession.toFixed(1)} icon={ArrowUpDown} />
        <KPICard title="Tempo Médio" value={formatTime(kpis.avgTimeOnSite)} icon={Clock} />
        <KPICard title="Bounce Rate" value={`${kpis.bounceRate.toFixed(1)}%`} icon={MousePointerClick} />
        <KPICard title="Conversão" value={`${kpis.conversionRate.toFixed(1)}%`} icon={MousePointerClick} />
      </motion.div>

      {/* Daily visits chart */}
      <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader><CardTitle className="text-base">Visitas Diárias</CardTitle></CardHeader>
          <CardContent>
            {dailyVisits.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados de visitas neste período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailyVisits}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(parseISO(v), "dd/MM")} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<VisitsTooltip />} />
                  <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} name="Views" />
                  <Area type="monotone" dataKey="sessions" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.1} strokeWidth={2} name="Sessões" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Devices */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-base">Dispositivos</CardTitle></CardHeader>
            <CardContent>
              {deviceBreakdown.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Sem dados.</p>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={deviceBreakdown} dataKey="count" nameKey="device" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                        {deviceBreakdown.map((_, i) => (
                          <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3 flex-1">
                    {deviceBreakdown.map((d, i) => {
                      const DevIcon = DEVICE_ICONS[d.device] || Globe;
                      return (
                        <div key={d.device} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: DEVICE_COLORS[i % DEVICE_COLORS.length] }} />
                            <DevIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="capitalize">{d.device}</span>
                          </div>
                          <span className="font-medium">{d.count} ({d.percentage.toFixed(0)}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top pages */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-base">Páginas Mais Vistas</CardTitle></CardHeader>
            <CardContent>
              {topPages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Sem dados.</p>
              ) : (
                <div className="space-y-2">
                  {topPages.map((p, i) => (
                    <div key={p.productId} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                        <span className="truncate max-w-[200px]">{p.productName}</span>
                      </div>
                      <span className="font-medium text-primary">{p.views} views</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic sources */}
        <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader><CardTitle className="text-base">Fontes de Tráfego</CardTitle></CardHeader>
            <CardContent>
              {trafficSources.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Sem dados UTM.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 font-medium">Fonte</th>
                        <th className="text-left py-2 font-medium">Meio</th>
                        <th className="text-right py-2 font-medium">Sessões</th>
                        <th className="text-right py-2 font-medium">Conv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trafficSources.map((s) => (
                        <tr key={`${s.source}-${s.medium}`} className="border-b border-border/30">
                          <td className="py-2">{s.source}</td>
                          <td className="py-2 text-muted-foreground">{s.medium}</td>
                          <td className="py-2 text-right font-medium">{s.sessions}</td>
                          <td className="py-2 text-right">{s.conversionRate.toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Referrers */}
        <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader><CardTitle className="text-base">Referrers</CardTitle></CardHeader>
            <CardContent>
              {referrers.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Sem dados.</p>
              ) : (
                <div className="space-y-2">
                  {referrers.map((r) => (
                    <div key={r.referrer} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{r.referrer}</span>
                      </div>
                      <span className="font-medium">{r.sessions}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Intent */}
      {aiIntents.length > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader><CardTitle className="text-base">Intenção do Visitante (AI)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {aiIntents.map((a) => (
                  <div key={a.intent} className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-lg font-bold">{a.count}</p>
                    <p className="text-xs text-muted-foreground capitalize">{a.intent}</p>
                    <p className="text-[11px] text-muted-foreground">{a.percentage.toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
});
