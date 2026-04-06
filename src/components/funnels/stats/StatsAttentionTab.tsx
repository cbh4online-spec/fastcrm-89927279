import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { StatsEvent, SectionData } from "./statsHelpers";

interface Props {
  sections: SectionData[];
  events: StatsEvent[];
}

export function StatsAttentionTab({ sections, events }: Props) {
  const attentionData = useMemo(() => {
    // Use section data with time info
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
        };
      });
  }, [sections]);

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

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Mapa de Atenção
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Tempo médio que os visitantes passam em cada secção da página
        </p>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-1.5">
            {attentionData.map((d) => {
              const intensity = d.avgTimeSec / maxTime;
              // Green for high attention, red for low
              const hue = Math.round(intensity * 120); // 0=red, 120=green
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
  );
}
