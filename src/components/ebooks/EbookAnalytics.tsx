import { useEbookAnalyticsKPIs } from "@/hooks/useEbookAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Eye, Users, Target, Clock, Monitor, Smartphone, Tablet, BarChart3, TrendingUp, UserCheck, ContactRound, MousePointerClick, ShieldCheck, MailCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { useNavigate } from "react-router-dom";

interface EbookAnalyticsProps {
  ebookId: string;
  ebookTitle: string;
  onBack: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function EbookAnalytics({ ebookId, ebookTitle, onBack }: EbookAnalyticsProps) {
  const navigate = useNavigate();
  const kpis = useEbookAnalyticsKPIs(ebookId);

  if (kpis.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const dailyData = Object.entries(kpis.dailyViews).map(([date, count]) => ({
    date: date.slice(5), // MM-DD
    views: count,
  }));

  const maxPage = Math.max(...Object.keys(kpis.pageDropOff).map(Number), 0);
  const dropOffData = Array.from({ length: maxPage + 1 }, (_, i) => ({
    page: i + 1,
    readers: kpis.pageDropOff[i] || 0,
  }));

  const deviceData = Object.entries(kpis.devices).map(([device, count]) => ({ device, count }));
  const sourceData = Object.entries(kpis.sources).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);

  const DeviceIcon = ({ type }: { type: string }) => {
    if (type === "mobile") return <Smartphone className="h-4 w-4" />;
    if (type === "tablet") return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Estatísticas</h2>
          <p className="text-sm text-muted-foreground">{ebookTitle}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Visualizações</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.totalViews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Leitores ID</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.uniqueReaders}</p>
            <p className="text-xs text-muted-foreground">{kpis.anonymousViews} anónimos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ContactRound className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">No CRM</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.readersInCrm}</p>
            <p className="text-xs text-muted-foreground">
              {kpis.uniqueReaders > 0 ? Math.round((kpis.readersInCrm / kpis.uniqueReaders) * 100) : 0}% dos identificados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Conclusão</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.completionRate}%</p>
            <p className="text-xs text-muted-foreground">{kpis.completedViews} completos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Tempo Médio</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatDuration(kpis.avgTimeSeconds)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily views */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Visualizações (últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Page drop-off */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Drop-off por página
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {dropOffData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dropOffData}>
                    <XAxis dataKey="page" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="readers" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem dados</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sources & Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fontes de tráfego</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <div className="space-y-2">
                {sourceData.slice(0, 8).map(s => (
                  <div key={s.source} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate max-w-[200px]">{s.source}</span>
                    <Badge variant="secondary" className="text-xs">{s.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            {deviceData.length > 0 ? (
              <div className="space-y-2">
                {deviceData.map(d => (
                  <div key={d.device} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground capitalize">
                      <DeviceIcon type={d.device} />
                      {d.device}
                    </span>
                    <Badge variant="secondary" className="text-xs">{d.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Identified readers table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            Leitores identificados ({kpis.identifiedReaders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kpis.identifiedReaders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                   <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wider">
                     <th className="text-left py-2 pr-3">Leitor</th>
                     <th className="text-center py-2 px-2">CRM</th>
                     <th className="text-center py-2 px-2">Páginas</th>
                     <th className="text-center py-2 px-2">Conclusão</th>
                     <th className="text-center py-2 px-2">Tempo</th>
                     <th className="text-right py-2 pl-3">Data</th>
                   </tr>
                </thead>
                <tbody>
                  {kpis.identifiedReaders.map((r, i) => (
                    <tr key={i} className="border-b border-border/20 last:border-0">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-foreground">{r.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </td>
                       <td className="text-center py-2 px-2">
                         {r.isInCrm ? (
                           <Badge
                             variant="default"
                             className="bg-emerald-500/90 text-white border-0 text-xs cursor-pointer hover:bg-emerald-600"
                             onClick={() => navigate(`/dashboard/contacts/${r.contactId}`)}
                           >
                             No CRM
                           </Badge>
                         ) : (
                           <Badge variant="outline" className="text-xs text-muted-foreground">Novo</Badge>
                         )}
                       </td>
                       <td className="text-center py-2 px-2 text-muted-foreground">{r.pagesViewed}/{r.totalPages}</td>
                      <td className="text-center py-2 px-2">
                        <Badge
                          variant={r.completed ? "default" : "secondary"}
                          className={r.completed ? "bg-emerald-500/90 text-white border-0 text-xs" : "text-xs"}
                        >
                          {r.completionPct}%
                        </Badge>
                      </td>
                      <td className="text-center py-2 px-2 text-muted-foreground">{formatDuration(r.timeSeconds)}</td>
                      <td className="text-right py-2 pl-3 text-xs text-muted-foreground">
                        {new Date(r.date).toLocaleDateString("pt-PT")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p>Nenhum leitor identificado ainda</p>
              <p className="text-xs mt-1">Ative a captura de leads nas configurações do eBook</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
