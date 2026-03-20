import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVerticalTemplateStats, useVerticalFullEvents } from "@/hooks/useVerticalFunnelManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, startOfDay, eachDayOfInterval, subDays } from "date-fns";
import { pt } from "date-fns/locale";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  BarChart3, Eye, Target, Users, TrendingUp, Brain, Loader2,
  Lightbulb, AlertTriangle, DollarSign, Globe, Smartphone, Monitor,
  Clock, ArrowUpRight, ArrowDownRight, MapPin, ExternalLink, Zap
} from "lucide-react";

interface Props {
  templateSlug: string;
}

interface AIInsight {
  score: number;
  bottleneck: string;
  suggestions: string[];
  revenue_forecast: string;
}

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  problems: "Problemas",
  solution: "Solução",
  transformation: "Transformação",
  testimonials: "Testemunhos",
  video: "Vídeo",
  authority: "Autoridade",
  roi: "ROI",
  "cta-form": "Formulário CTA",
};

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#6366f1", "#ec4899"
];

const INDUSTRY_BENCHMARKS: Record<string, number> = {
  saas: 2.5,
  ecommerce: 3.2,
  services: 4.1,
  real_estate: 1.8,
  restaurants: 5.0,
  education: 3.5,
  default: 3.0,
};

export function VerticalStatsTab({ templateSlug }: Props) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: stats = [], isLoading } = useVerticalTemplateStats(templateSlug, dateFrom || undefined, dateTo || undefined);
  const { data: events = [] } = useVerticalFullEvents(templateSlug, dateFrom || undefined, dateTo || undefined);

  const [aiInsights, setAiInsights] = useState<AIInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const totalViews = stats.reduce((s, r) => s + r.views, 0);
  const totalUnique = stats.reduce((s, r) => s + r.uniqueViews, 0);
  const totalSubmissions = stats.reduce((s, r) => s + r.submissions, 0);
  const conversionRate = totalViews > 0 ? ((totalSubmissions / totalViews) * 100).toFixed(1) : "0";
  const bounceRate = totalViews > 0 ? (((totalViews - totalSubmissions) / totalViews) * 100).toFixed(1) : "0";

  // ── Computed analytics ──
  const trendData = useMemo(() => {
    if (events.length === 0) return [];
    const viewEvents = events.filter(e => e.event_type === "view");
    const submitEvents = events.filter(e => e.event_type === "form_submit");
    if (viewEvents.length === 0) return [];

    const minDate = parseISO(viewEvents[0].created_at);
    const maxDate = parseISO(viewEvents[viewEvents.length - 1].created_at);
    const days = eachDayOfInterval({ start: startOfDay(minDate), end: startOfDay(maxDate) });

    return days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayViews = viewEvents.filter(e => e.created_at.startsWith(dayStr)).length;
      const daySubs = submitEvents.filter(e => e.created_at.startsWith(dayStr)).length;
      return {
        date: format(day, "dd MMM", { locale: pt }),
        visitantes: dayViews,
        conversões: daySubs,
      };
    });
  }, [events]);

  const utmBreakdown = useMemo(() => {
    const sources: Record<string, { views: number; submissions: number }> = {};
    for (const e of events) {
      const src = e.utm_source || e.referrer || "directo";
      const label = src.replace(/^https?:\/\//, "").split("/")[0].substring(0, 30);
      if (!sources[label]) sources[label] = { views: 0, submissions: 0 };
      if (e.event_type === "view") sources[label].views++;
      else if (e.event_type === "form_submit") sources[label].submissions++;
    }
    return Object.entries(sources)
      .map(([name, v]) => ({ name, ...v, rate: v.views > 0 ? ((v.submissions / v.views) * 100) : 0 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }, [events]);

  const deviceBreakdown = useMemo(() => {
    const devices: Record<string, number> = {};
    for (const e of events) {
      if (e.event_type !== "view") continue;
      const d = e.device_type || "desconhecido";
      devices[d] = (devices[d] || 0) + 1;
    }
    return Object.entries(devices).map(([name, value]) => ({ name, value }));
  }, [events]);

  const geoBreakdown = useMemo(() => {
    const geo: Record<string, number> = {};
    for (const e of events) {
      if (e.event_type !== "view" || !e.country) continue;
      const loc = e.city ? `${e.city}, ${e.country}` : e.country;
      geo[loc] = (geo[loc] || 0) + 1;
    }
    return Object.entries(geo)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [events]);

  const sectionHeatmap = useMemo(() => {
    const sectionEvents = events.filter(e => e.event_type === "section_view" && e.page_section);
    const sections: Record<string, number> = {};
    for (const e of sectionEvents) {
      const sec = e.page_section!;
      sections[sec] = (sections[sec] || 0) + 1;
    }
    const ordered = [
      "hero", "problems", "solution", "transformation",
      "testimonials", "video", "authority", "roi", "cta-form"
    ];
    return ordered.map(sec => ({
      section: SECTION_LABELS[sec] || sec,
      views: sections[sec] || 0,
    }));
  }, [events]);

  const recentTimeline = useMemo(() => {
    return events
      .filter(e => e.event_type === "view" || e.event_type === "form_submit")
      .slice(-20)
      .reverse()
      .map(e => ({
        type: e.event_type,
        time: format(parseISO(e.created_at), "dd MMM HH:mm", { locale: pt }),
        device: e.device_type || "—",
        source: e.utm_source || (e.referrer ? new URL(e.referrer).hostname : "directo"),
        location: e.country ? (e.city ? `${e.city}, ${e.country}` : e.country) : "—",
      }));
  }, [events]);

  const benchmarkRate = INDUSTRY_BENCHMARKS.default;

  const analyzeWithAI = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vertical-ai-insights", {
        body: {
          template_slug: templateSlug,
          stats: {
            totalViews, totalUnique, totalSubmissions, conversionRate,
            sections: stats,
            sectionHeatmap,
            utmBreakdown,
            deviceBreakdown,
            trendData: trendData.slice(-14),
          },
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setAiInsights(data);
    } catch (e: any) {
      toast.error("Erro ao analisar: " + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-destructive";
  };

  const convNum = parseFloat(conversionRate);
  const convTrend = convNum >= benchmarkRate ? "up" : "down";

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
          </div>
        </div>
        <Button onClick={analyzeWithAI} disabled={aiLoading} variant="outline" className="gap-2">
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {aiInsights ? "Reanalisar" : "Analisar com IA"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-medium">Visitantes</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalViews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{totalUnique} únicos</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium">Conversão</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold tabular-nums">{conversionRate}%</p>
              {convTrend === "up" ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Benchmark: {benchmarkRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Submissões</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalSubmissions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Bounce Rate</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{bounceRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-medium">Sessões</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalUnique.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{events.length} eventos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different analytics views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="sources">Fontes</TabsTrigger>
          <TabsTrigger value="sections">Secções</TabsTrigger>
          <TabsTrigger value="geo">Geo & Device</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          {/* Conversion funnel */}
          {totalViews > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Funil de Conversão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 py-4">
                  {[
                    { name: "Visitantes", value: totalViews },
                    { name: "Únicos", value: totalUnique },
                    { name: "Submissões", value: totalSubmissions },
                  ].map((stage, i, arr) => {
                    const maxValue = Math.max(arr[0].value, 1);
                    const width = Math.max((stage.value / maxValue) * 100, 5);
                    const prevValue = i > 0 ? arr[i - 1].value : stage.value;
                    const rate = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(1) : "0";
                    const colors = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];
                    return (
                      <div key={stage.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">{stage.name}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {stage.value.toLocaleString()}
                            {i > 0 && <span className="ml-1 text-xs">({rate}%)</span>}
                          </span>
                        </div>
                        <div className="h-8 bg-muted/30 rounded-lg overflow-hidden">
                          <div
                            className="h-full rounded-lg transition-all duration-500"
                            style={{ width: `${width}%`, backgroundColor: colors[i] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benchmark comparison */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Benchmark do Sector
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(INDUSTRY_BENCHMARKS)
                  .filter(([k]) => k !== "default")
                  .map(([sector, rate]) => (
                    <div key={sector} className="flex items-center gap-3">
                      <span className="text-xs w-24 capitalize text-muted-foreground">
                        {sector === "saas" ? "SaaS" : sector === "real_estate" ? "Imobiliário" : 
                         sector === "ecommerce" ? "E-commerce" : sector === "services" ? "Serviços" :
                         sector === "restaurants" ? "Restauração" : sector === "education" ? "Educação" : sector}
                      </span>
                      <div className="flex-1 h-5 bg-muted/30 rounded relative">
                        <div
                          className="h-full bg-muted/60 rounded"
                          style={{ width: `${Math.min(rate * 10, 100)}%` }}
                        />
                        {convNum > 0 && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-primary"
                            style={{ left: `${Math.min(convNum * 10, 100)}%` }}
                            title={`A sua taxa: ${conversionRate}%`}
                          />
                        )}
                      </div>
                      <span className="text-xs tabular-nums w-10 text-right">{rate}%</span>
                    </div>
                  ))}
                <p className="text-xs text-muted-foreground mt-2">
                  Linha vertical = a sua taxa ({conversionRate}%)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Evolução Diária</CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="visitantes" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="conversões" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-60 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Sem dados suficientes para tendências</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sources/UTM */}
        <TabsContent value="sources" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                Fontes de Tráfego
              </CardTitle>
            </CardHeader>
            <CardContent>
              {utmBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={utmBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="views" fill="hsl(var(--primary))" name="Visitas" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="submissions" fill="hsl(var(--chart-3))" name="Conversões" radius={[4, 4, 0, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fonte</TableHead>
                        <TableHead className="text-right">Visitas</TableHead>
                        <TableHead className="text-right">Conversões</TableHead>
                        <TableHead className="text-right">Taxa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {utmBreakdown.map(s => (
                        <TableRow key={s.name}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.views}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.submissions}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.rate.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Sem dados de fonte — use links com UTM para rastrear origens</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sections heatmap */}
        <TabsContent value="sections" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Heatmap de Secções (Scroll Depth)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sectionHeatmap.some(s => s.views > 0) ? (
                <div className="space-y-3 py-2">
                  {sectionHeatmap.map((sec, i) => {
                    const maxViews = Math.max(...sectionHeatmap.map(s => s.views), 1);
                    const pct = (sec.views / maxViews) * 100;
                    const dropOff = i > 0 && sectionHeatmap[i - 1].views > 0
                      ? ((1 - sec.views / sectionHeatmap[i - 1].views) * 100).toFixed(0)
                      : null;
                    // Heatmap color from green to red based on drop position
                    const heat = pct > 70 ? "bg-emerald-500/80" : pct > 40 ? "bg-amber-500/80" : "bg-destructive/60";
                    return (
                      <div key={sec.section} className="flex items-center gap-3">
                        <span className="text-xs w-28 text-muted-foreground truncate">{sec.section}</span>
                        <div className="flex-1 h-7 bg-muted/30 rounded-md overflow-hidden relative">
                          <div className={`h-full rounded-md transition-all duration-500 ${heat}`} style={{ width: `${Math.max(pct, 3)}%` }} />
                        </div>
                        <span className="text-xs tabular-nums w-12 text-right">{sec.views}</span>
                        {dropOff !== null && parseInt(dropOff) > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-500 border-amber-500/30">
                            -{dropOff}%
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground mt-2">
                    Mostra quantos visitantes viram cada secção. Quedas elevadas indicam pontos de abandono.
                  </p>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground flex-col gap-2">
                  <BarChart3 className="h-8 w-8" />
                  <p className="text-sm">Dados de secções a acumular — aparecem após novas visitas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geo & Device */}
        <TabsContent value="geo" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Device */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Dispositivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deviceBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={deviceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {deviceBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                )}
              </CardContent>
            </Card>

            {/* Geo */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Localização
                </CardTitle>
              </CardHeader>
              <CardContent>
                {geoBreakdown.length > 0 ? (
                  <div className="space-y-2">
                    {geoBreakdown.map(g => (
                      <div key={g.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{g.name}</span>
                        <span className="tabular-nums font-medium">{g.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground flex-col gap-2">
                    <Globe className="h-8 w-8" />
                    <p className="text-sm">Dados geográficos a acumular</p>
                    <p className="text-xs">País/cidade são capturados em novas visitas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Timeline de Eventos (últimos 20)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTimeline.length > 0 ? (
                <div className="space-y-2">
                  {recentTimeline.map((evt, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${evt.type === "form_submit" ? "bg-emerald-500" : "bg-primary"}`} />
                      <Badge variant={evt.type === "form_submit" ? "default" : "secondary"} className="text-[10px] px-1.5">
                        {evt.type === "form_submit" ? "Conversão" : "Visita"}
                      </Badge>
                      <span className="text-xs text-muted-foreground tabular-nums">{evt.time}</span>
                      <span className="text-xs text-muted-foreground">{evt.device === "mobile" ? "📱" : "🖥️"}</span>
                      <span className="text-xs text-muted-foreground truncate flex-1">{evt.source}</span>
                      <span className="text-xs text-muted-foreground">{evt.location}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Sem eventos registados</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Insights */}
      {aiLoading && (
        <Card className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">A analisar dados com IA...</p>
        </Card>
      )}

      {aiInsights && !aiLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Análise IA</h3>
            <Badge variant="secondary" className="text-xs">Gemini</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Score de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className={`text-4xl font-bold ${getScoreColor(aiInsights.score)}`}>
                  {aiInsights.score}/100
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Previsão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">{aiInsights.revenue_forecast}</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Gargalo Identificado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{aiInsights.bottleneck}</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Sugestões de Melhoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {aiInsights.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                      <span className="text-muted-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
