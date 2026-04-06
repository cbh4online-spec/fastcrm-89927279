import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MousePointerClick } from "lucide-react";
import type { StatsEvent } from "./statsHelpers";

interface Props {
  events: StatsEvent[];
}

interface ClickPoint {
  x: number;
  y: number;
  element: string;
  count: number;
}

export function StatsClicksTab({ events }: Props) {
  const { clickPoints, topElements, totalClicks } = useMemo(() => {
    const clickEvents = events.filter(e =>
      e.event_type === "element_click" &&
      (e as any).click_x_pct != null &&
      (e as any).click_y_pct != null
    );

    // Aggregate by grid cells (10x10 grid)
    const grid: Record<string, { x: number; y: number; count: number }> = {};
    const elementCounts: Record<string, number> = {};

    for (const e of clickEvents) {
      const x = Math.floor(((e as any).click_x_pct || 0) / 10) * 10;
      const y = Math.floor(((e as any).click_y_pct || 0) / 10) * 10;
      const key = `${x}-${y}`;
      if (!grid[key]) grid[key] = { x, y, count: 0 };
      grid[key].count++;

      const el = (e as any).click_element || "unknown";
      elementCounts[el] = (elementCounts[el] || 0) + 1;
    }

    const points: ClickPoint[] = Object.values(grid).map(g => ({
      x: g.x,
      y: g.y,
      element: "",
      count: g.count,
    }));

    const topEls = Object.entries(elementCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([element, count]) => ({ element, count }));

    return {
      clickPoints: points,
      topElements: topEls,
      totalClicks: clickEvents.length,
    };
  }, [events]);

  if (totalClicks === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <MousePointerClick className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground text-sm">
            Sem dados de cliques ainda. Os dados aparecem quando visitantes clicam em elementos da página.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...clickPoints.map(p => p.count), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visual Heatmap */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              Mapa de Cliques
              <Badge variant="secondary" className="text-[10px]">{totalClicks} cliques</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full aspect-[4/3] bg-muted/20 rounded-lg border border-border/30 overflow-hidden">
              {/* Grid overlay */}
              {clickPoints.map((p, i) => {
                const opacity = Math.max(0.15, (p.count / maxCount) * 0.9);
                const size = Math.max(20, (p.count / maxCount) * 50);
                return (
                  <div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: `hsl(var(--primary) / ${opacity})`,
                      transform: "translate(-50%, -50%)",
                      filter: `blur(${Math.max(2, size / 5)}px)`,
                    }}
                    title={`${p.count} cliques`}
                  />
                );
              })}
              {/* Legend */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-muted-foreground bg-background/80 px-2 py-1 rounded">
                <span>Menos</span>
                <div className="flex gap-0.5">
                  {[0.2, 0.4, 0.6, 0.8].map(o => (
                    <div key={o} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `hsl(var(--primary) / ${o})` }} />
                  ))}
                </div>
                <span>Mais</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Elements */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 10 Elementos Clicados</CardTitle>
          </CardHeader>
          <CardContent>
            {topElements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            ) : (
              <div className="space-y-2">
                {topElements.map((el, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <span className="font-mono text-xs truncate max-w-[200px]">{el.element}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{el.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
