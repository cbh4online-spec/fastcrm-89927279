import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BarChart3, CheckCircle2, XCircle, AlertTriangle, Clock, TrendingDown, TrendingUp, Minus, Lightbulb, Monitor, Smartphone, Layers } from "lucide-react";
import { type SectionData, type StatsEvent, type SectionHeatmapGrid, computeSectionHeatmapGrid, generateSectionInsights } from "./statsHelpers";

interface Props {
  sections: SectionData[];
  hasData: boolean;
  events?: StatsEvent[];
  totalViews?: number;
  hasPixelActivity?: boolean;
  hasSectionViews?: boolean;
}

type DeviceFilter = "all" | "desktop" | "mobile";

function formatTimeMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
}

function ReadinessChecklist({ hasPixelActivity, hasSectionViews, sectionCount }: {
  hasPixelActivity: boolean;
  hasSectionViews: boolean;
  sectionCount: number;
}) {
  const items = [
    { ok: hasPixelActivity, label: "Pixel a registar visitas" },
    { ok: hasSectionViews, label: "Scroll tracking ativo", partial: hasPixelActivity && !hasSectionViews },
    { ok: sectionCount >= 3, label: `${sectionCount} secções com dados`, partial: sectionCount > 0 && sectionCount < 3 },
  ];

  return (
    <div className="space-y-2 text-left w-full max-w-xs mt-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          {item.ok ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : item.partial ? (
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function HeatmapGrid({ grid }: { grid: SectionHeatmapGrid[] }) {
  const maxViews = useMemo(() => {
    let max = 0;
    for (const row of grid) {
      for (const d of row.dailyViews) {
        if (d.views > max) max = d.views;
      }
    }
    return max || 1;
  }, [grid]);

  if (grid.length === 0) return null;

  return (
    <Card className="border-white/[0.08] rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Heatmap Diário (Secções × Dias)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            {/* Header row */}
            <div className="flex items-center gap-1 mb-1">
              <div className="w-28 shrink-0" />
              {grid[0]?.dailyViews.map((d, i) => (
                <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground">{d.date}</div>
              ))}
            </div>
            {/* Data rows */}
            {grid.map((row) => (
              <div key={row.sectionKey} className="flex items-center gap-1 mb-0.5">
                <div className="w-28 shrink-0 text-xs text-muted-foreground truncate">{row.sectionLabel}</div>
                {row.dailyViews.map((d, i) => {
                  const intensity = d.views / maxViews;
                  const bg = d.views === 0
                    ? "bg-muted/10"
                    : intensity > 0.7
                      ? "bg-emerald-500/80"
                      : intensity > 0.4
                        ? "bg-emerald-500/50"
                        : intensity > 0.15
                          ? "bg-emerald-500/25"
                          : "bg-emerald-500/10";
                  return (
                    <TooltipProvider key={i}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`flex-1 h-6 rounded-sm ${bg} cursor-default transition-colors`} />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p>{row.sectionLabel} — {d.date}</p>
                          <p className="font-semibold">{d.views} views</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="text-[10px] text-muted-foreground">Menos</span>
              {["bg-muted/10", "bg-emerald-500/10", "bg-emerald-500/25", "bg-emerald-500/50", "bg-emerald-500/80"].map((c, i) => (
                <div key={i} className={`w-4 h-3 rounded-sm ${c}`} />
              ))}
              <span className="text-[10px] text-muted-foreground">Mais</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionInsightsCard({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;
  return (
    <Card className="border-amber-500/20 bg-amber-500/5 rounded-xl">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-amber-400">Recomendações</h4>
            {insights.map((text, i) => (
              <p key={i} className="text-xs text-muted-foreground leading-relaxed">{text}</p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsSectionsTab({ sections, hasData, events = [], totalViews = 0, hasPixelActivity, hasSectionViews }: Props) {
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("all");

  // Compute dynamic readiness
  const pixelActive = hasPixelActivity ?? events.some(e => e.event_type === "view");
  const sectionActive = hasSectionViews ?? events.some(e => e.event_type === "section_view");
  const sectionCount = sections.filter(s => s.views > 0).length;

  // Filter events by device
  const filteredEvents = useMemo(() => {
    if (deviceFilter === "all") return events;
    return events.filter(e => {
      const d = (e.device_type || "desktop").toLowerCase();
      if (deviceFilter === "mobile") return d === "mobile";
      return d === "desktop";
    });
  }, [events, deviceFilter]);

  // Compute heatmap grid from filtered events
  const heatmapGrid = useMemo(() => {
    if (!hasData || filteredEvents.length === 0) return [];
    return computeSectionHeatmapGrid(filteredEvents, 7);
  }, [filteredEvents, hasData]);

  const insights = useMemo(() => generateSectionInsights(sections), [sections]);

  if (!hasData) {
    return (
      <Card className="border-white/[0.08] rounded-xl">
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center max-w-md mx-auto gap-4">
            {/* Stylized heatmap illustration */}
            <div className="grid grid-cols-5 gap-1 opacity-40 mb-2">
              {[90, 80, 60, 40, 20, 85, 70, 50, 30, 10, 75, 55, 35, 15, 5].map((v, i) => (
                <div
                  key={i}
                  className="w-8 h-5 rounded-sm"
                  style={{ backgroundColor: `hsla(${v > 60 ? 150 : v > 30 ? 40 : 0}, 70%, 50%, ${v / 100})` }}
                />
              ))}
            </div>
            <h3 className="font-semibold text-base">Heatmap de Secções</h3>
            <p className="text-sm text-muted-foreground">
              Os dados de secções aparecem após 10+ visitas com scroll tracking ativo. Esta funcionalidade mostra quais secções da tua landing page retêm mais atenção.
            </p>
            <ReadinessChecklist
              hasPixelActivity={pixelActive}
              hasSectionViews={sectionActive}
              sectionCount={sectionCount}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxViews = Math.max(...sections.map(s => s.views), 1);

  return (
    <div className="space-y-4">
      {/* Device filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-amber-400" />
          Análise de Secções
        </h3>
        <ToggleGroup type="single" value={deviceFilter} onValueChange={(v) => v && setDeviceFilter(v as DeviceFilter)} size="sm">
          <ToggleGroupItem value="all" className="text-xs gap-1 h-7 px-2">
            <Layers className="h-3 w-3" /> Todos
          </ToggleGroupItem>
          <ToggleGroupItem value="desktop" className="text-xs gap-1 h-7 px-2">
            <Monitor className="h-3 w-3" /> Desktop
          </ToggleGroupItem>
          <ToggleGroupItem value="mobile" className="text-xs gap-1 h-7 px-2">
            <Smartphone className="h-3 w-3" /> Mobile
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Heatmap Grid */}
      <HeatmapGrid grid={heatmapGrid} />

      {/* Detailed table */}
      <Card className="border-white/[0.08] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-400" />
            Detalhe por Secção
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_60px_70px_80px_70px_40px] gap-2 pb-2 border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
            <span>Secção</span>
            <span className="text-right">Views</span>
            <span className="text-right">Alcance</span>
            <span className="text-right">Tempo Médio</span>
            <span className="text-right">Drop-off</span>
            <span />
          </div>
          <div className="space-y-1 py-2">
            {sections.map((sec) => {
              const reachPct = (sec.views / maxViews) * 100;

              return (
                <div key={sec.sectionKey} className="grid grid-cols-[1fr_60px_70px_80px_70px_40px] gap-2 items-center py-1.5 group">
                  {/* Section name + bar */}
                  <div className="space-y-1">
                    <span className="text-xs font-medium truncate block">{sec.section}</span>
                    <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          reachPct > 70 ? "bg-emerald-500/70" : reachPct > 30 ? "bg-amber-500/70" : "bg-red-500/50"
                        }`}
                        style={{ width: `${Math.max(reachPct, 3)}%` }}
                      />
                    </div>
                  </div>

                  {/* Views */}
                  <span className="text-xs tabular-nums text-right font-medium">{sec.views}</span>

                  {/* Reach % */}
                  <span className="text-xs tabular-nums text-right text-muted-foreground">{Math.round(reachPct)}%</span>

                  {/* Avg Time */}
                  <span className="text-xs tabular-nums text-right text-muted-foreground flex items-center justify-end gap-1">
                    {sec.avgTimeMs !== null && <Clock className="h-3 w-3 opacity-50" />}
                    {formatTimeMs(sec.avgTimeMs)}
                  </span>

                  {/* Drop-off */}
                  <div className="text-right">
                    {sec.dropOff !== null && sec.dropOff > 0 ? (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          sec.isWorst
                            ? "text-red-400 border-red-500/30 bg-red-500/10"
                            : sec.dropOff > 20
                              ? "text-amber-400 border-amber-500/30"
                              : "text-muted-foreground border-white/10"
                        }`}
                      >
                        -{sec.dropOff}%
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Trend / Problem badge */}
                  <div className="flex justify-end">
                    {sec.isWorst ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs max-w-[200px]">
                            {sec.recommendation || "Esta secção tem o maior drop-off da página."}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : sec.trend === "up" ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    ) : sec.trend === "down" ? (
                      <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 text-muted-foreground/30" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Quedas elevadas entre secções indicam pontos de abandono. Foca-te em melhorar a secção com o ícone ⚠.
          </p>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <SectionInsightsCard insights={insights} />
    </div>
  );
}
