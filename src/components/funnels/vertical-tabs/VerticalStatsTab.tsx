import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useVerticalTemplateStats, useVerticalFullEvents } from "@/hooks/useVerticalFunnelManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Brain, Loader2, RefreshCw, Download, FileText, Copy, Clock,
  Lightbulb, AlertTriangle, DollarSign, TrendingUp
} from "lucide-react";

import { OptimizationDrawer } from "../stats/OptimizationDrawer";

import { StatsOverviewTab } from "../stats/StatsOverviewTab";
import { StatsTrendsTab } from "../stats/StatsTrendsTab";
import { StatsSourcesTab } from "../stats/StatsSourcesTab";
import { StatsSectionsTab } from "../stats/StatsSectionsTab";
import { StatsGeoDeviceTab } from "../stats/StatsGeoDeviceTab";
import { StatsTimelineTab } from "../stats/StatsTimelineTab";
import {
  type DatePreset, type StatsEvent,
  computeTrendData, computeSourceBreakdown, computeDeviceBreakdown,
  computeGeoBreakdown, computeSectionHeatmap, computeTimeline,
  exportToCSV,
} from "../stats/statsHelpers";

interface Props {
  templateSlug: string;
}

interface AIInsight {
  score: number;
  bottleneck: string;
  suggestions: string[];
  revenue_forecast: string;
}

export function VerticalStatsTab({ templateSlug }: Props) {
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [aiInsights, setAiInsights] = useState<AIInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const dateFrom = useMemo(() => {
    if (preset === "custom") return customFrom;
    const days = preset === "today" ? 0 : preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    return format(subDays(new Date(), days), "yyyy-MM-dd");
  }, [preset, customFrom]);

  const dateTo = useMemo(() => {
    if (preset === "custom") return customTo;
    return format(new Date(), "yyyy-MM-dd");
  }, [preset, customTo]);

  const { data: stats = [], isLoading, refetch: refetchStats } = useVerticalTemplateStats(templateSlug, dateFrom, dateTo);
  const { data: events = [], refetch: refetchEvents } = useVerticalFullEvents(templateSlug, dateFrom, dateTo);

  const totalViews = stats.reduce((s, r) => s + r.views, 0);
  const totalUnique = stats.reduce((s, r) => s + r.uniqueViews, 0);
  const totalSubmissions = stats.reduce((s, r) => s + r.submissions, 0);
  const conversionRate = totalViews > 0 ? (totalSubmissions / totalViews) * 100 : 0;
  const bounceRate = totalViews > 0 ? ((totalViews - totalSubmissions) / totalViews) * 100 : 0;

  const trendData = useMemo(() => computeTrendData(events as StatsEvent[]), [events]);
  const sources = useMemo(() => computeSourceBreakdown(events as StatsEvent[]), [events]);
  const devices = useMemo(() => computeDeviceBreakdown(events as StatsEvent[]), [events]);
  const geo = useMemo(() => computeGeoBreakdown(events as StatsEvent[]), [events]);
  const sections = useMemo(() => computeSectionHeatmap(events as StatsEvent[], totalViews), [events, totalViews]);
  const timeline = useMemo(() => computeTimeline(events as StatsEvent[]), [events]);

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchEvents();
    setLastRefresh(new Date());
    toast.success("Dados atualizados");
  }, [refetchStats, refetchEvents]);

  const analyzeWithAI = useCallback(async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vertical-ai-insights", {
        body: {
          template_slug: templateSlug,
          stats: {
            totalViews, totalUnique, totalSubmissions, conversionRate: conversionRate.toFixed(1),
            sections: stats,
            sectionHeatmap: sections,
            utmBreakdown: sources,
            deviceBreakdown: devices,
            trendData: trendData.slice(-14),
          },
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setAiInsights(data);
    } catch (e: any) {
      toast.error("Erro ao analisar: " + e.message);
    } finally {
      setAiLoading(false);
    }
  }, [templateSlug, totalViews, totalUnique, totalSubmissions, conversionRate, stats, sections, sources, devices, trendData]);

  const handleExportCSV = useCallback(() => {
    exportToCSV(
      ["Data", "Visitantes", "Conversões", "Taxa"],
      trendData.map(d => [d.rawDate, String(d.visitantes), String(d.conversões), `${d.taxa}%`]),
      `analytics-${templateSlug}-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    toast.success("CSV exportado");
  }, [trendData, templateSlug]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const presetButtons: { key: DatePreset; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "7d", label: "7D" },
    { key: "30d", label: "30D" },
    { key: "90d", label: "90D" },
  ];

  return (
    <div className="space-y-6">
      {/* Global Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/30 rounded-lg p-0.5">
            {presetButtons.map(p => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${preset === p.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(lastRefresh, { locale: pt, addSuffix: true })}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV} className="text-xs gap-2">
                <FileText className="h-3.5 w-3.5" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copiado"); }} className="text-xs gap-2">
                <Copy className="h-3.5 w-3.5" /> Copiar link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Skeleton loading */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-white/[0.08] rounded-xl">
              <CardContent className="pt-4 pb-3 space-y-2">
                <div className="h-4 w-20 bg-muted/30 rounded animate-pulse" />
                <div className="h-7 w-16 bg-muted/20 rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted/10 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      {!isLoading && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="trends">Tendências</TabsTrigger>
            <TabsTrigger value="sources">Fontes</TabsTrigger>
            <TabsTrigger value="sections">Secções</TabsTrigger>
            <TabsTrigger value="geo">Geo & Device</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <StatsOverviewTab
              totalViews={totalViews}
              totalUnique={totalUnique}
              totalSubmissions={totalSubmissions}
              conversionRate={conversionRate}
              bounceRate={bounceRate}
              events={events as StatsEvent[]}
              sources={sources}
              onAnalyzeAI={analyzeWithAI}
              aiLoading={aiLoading}
            />
          </TabsContent>

          <TabsContent value="trends">
            <StatsTrendsTab trendData={trendData} />
          </TabsContent>

          <TabsContent value="sources">
            <StatsSourcesTab sources={sources} />
          </TabsContent>

          <TabsContent value="sections">
            <StatsSectionsTab sections={sections} hasData={sections.some(s => s.views > 0)} />
          </TabsContent>

          <TabsContent value="geo">
            <StatsGeoDeviceTab devices={devices} geo={geo} />
          </TabsContent>

          <TabsContent value="timeline">
            <StatsTimelineTab timeline={timeline} />
          </TabsContent>
        </Tabs>
      )}

      {/* AI Insights Panel */}
      {aiLoading && (
        <Card className="flex flex-col items-center justify-center py-12 border-white/[0.08] rounded-xl">
          <Loader2 className="h-10 w-10 animate-spin text-amber-400 mb-4" />
          <p className="text-muted-foreground">A analisar dados com IA...</p>
        </Card>
      )}

      {aiInsights && !aiLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold">Análise IA</h3>
            <Badge variant="secondary" className="text-xs">Gemini</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-white/[0.08] rounded-xl">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> Score de Performance
                </p>
                <span className={`text-4xl font-bold ${getScoreColor(aiInsights.score)}`}>
                  {aiInsights.score}/100
                </span>
              </CardContent>
            </Card>
            <Card className="border-white/[0.08] rounded-xl">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Previsão
                </p>
                <p className="text-lg font-medium">{aiInsights.revenue_forecast}</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2 border-white/[0.08] rounded-xl">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Gargalo Identificado
                </p>
                <p className="text-sm text-muted-foreground">{aiInsights.bottleneck}</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2 border-white/[0.08] rounded-xl">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-400" /> Sugestões de Melhoria
                </p>
                <ul className="space-y-2">
                  {aiInsights.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-400 font-bold mt-0.5">{i + 1}.</span>
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
