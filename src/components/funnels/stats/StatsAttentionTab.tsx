import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Clock, ArrowDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { StatsEvent, SectionData } from "./statsHelpers";

interface Props {
  sections: SectionData[];
  events: StatsEvent[];
}

export function StatsAttentionTab({ sections, events }: Props) {
  const attentionData = useMemo(() => {
    return sections
      .filter(s => s.views > 0)
      .map(s => {
        const avgTimeSec = s.avgTimeMs ? s.avgTimeMs / 1000 : 0;
        return {
          section: s.section,
          sectionKey: s.sectionKey,
          views: s.views,
          avgTimeSec,
          pct: s.pct,
          dropOff: s.dropOff,
          isWorst: s.isWorst,
        };
      });
  }, [sections]);

  // Compute scroll depth distribution from events
  const scrollDepthBands = useMemo(() => {
    const scrollEvents = events.filter(e =>
      e.event_type === "section_view" && e.page_section
    );
    if (scrollEvents.length === 0 || attentionData.length === 0) return null;

    const totalSessions = new Set(events.filter(e => e.event_type === "view").map(e => e.session_id)).size;
    if (totalSessions === 0) return null;

    // Use sections as proxy for scroll depth bands
    return attentionData.map((d, i) => ({
      label: d.section,
      reachPct: totalSessions > 0 ? Math.round((d.views / totalSessions) * 100) : 0,
      position: i,
    }));
  }, [events, attentionData]);

  if (attentionData.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <Eye className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground text-sm">
            Sem dados de atenção. Aparecem quando visitantes interagem com as secções.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxTime = Math.max(...attentionData.map(d => d.avgTimeSec), 1);
  const totalTime = attentionData.reduce((sum, d) => sum + d.avgTimeSec, 0);

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tempo Total Médio</p>
            <p className="text-xl font-bold">{totalTime.toFixed(0)}s</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Secção + Longa</p>
            <p className="text-xl font-bold truncate">
              {attentionData.reduce((best, d) => d.avgTimeSec > best.avgTimeSec ? d : best).section}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Secções Vistas</p>
            <p className="text-xl font-bold">{attentionData.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attention Heatmap */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Mapa de Atenção
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Tempo médio que os visitantes passam em cada secção
            </p>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <div className="space-y-1.5">
                {attentionData.map((d) => {
                  const intensity = d.avgTimeSec / maxTime;
                  const hue = Math.round(intensity * 120);
                  const color = `hsl(${hue}, 70%, 45%)`;

                  return (
                    <Tooltip key={d.sectionKey}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-3 group cursor-default">
                          <span className="text-xs text-muted-foreground w-28 truncate shrink-0">
                            {d.section}
                          </span>
                          <div className="flex-1 h-8 relative rounded overflow-hidden bg-muted/20">
                            <div
                              className="absolute inset-y-0 left-0 rounded transition-all"
                              style={{
                                width: `${Math.max(5, intensity * 100)}%`,
                                backgroundColor: color,
                                opacity: 0.7,
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-end pr-2">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {d.avgTimeSec.toFixed(1)}s
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
                            {d.pct.toFixed(0)}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          <strong>{d.section}</strong>: {d.views} views, tempo médio {d.avgTimeSec.toFixed(1)}s, alcance {d.pct.toFixed(1)}%
                          {d.dropOff ? `, drop-off ${d.dropOff}%` : ""}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/30">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(0, 70%, 45%)" }} />
                <span>Pouca atenção</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(60, 70%, 45%)" }} />
                <span>Moderado</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(120, 70%, 45%)" }} />
                <span>Alta atenção</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scroll Depth Funnel */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowDown className="h-4 w-4" />
              Funil de Scroll
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Percentagem de visitantes que alcançam cada secção
            </p>
          </CardHeader>
          <CardContent>
            {scrollDepthBands && scrollDepthBands.length > 0 ? (
              <div className="space-y-1">
                {scrollDepthBands.map((band, i) => {
                  const width = Math.max(8, band.reachPct);
                  const isLast = i === scrollDepthBands.length - 1;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-24 truncate shrink-0">
                        {band.label}
                      </span>
                      <div className="flex-1 relative">
                        <div
                          className="h-6 rounded transition-all flex items-center justify-end pr-2"
                          style={{
                            width: `${width}%`,
                            backgroundColor: isLast
                              ? "hsl(var(--primary) / 0.3)"
                              : `hsl(var(--primary) / ${0.15 + (1 - i / scrollDepthBands.length) * 0.5})`,
                          }}
                        >
                          <span className="text-[10px] font-medium text-foreground/80">
                            {band.reachPct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Dados insuficientes para o funil de scroll
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
