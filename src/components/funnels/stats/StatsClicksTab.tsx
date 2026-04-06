import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MousePointerClick, Monitor, Smartphone, Tablet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type DeviceFilter = "all" | "desktop" | "mobile" | "tablet";

export function StatsClicksTab({ events }: Props) {
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("all");

  const { clickPoints, topElements, totalClicks, deviceCounts } = useMemo(() => {
    const allClickEvents = events.filter(e =>
      e.event_type === "element_click" &&
      (e as any).click_x_pct != null &&
      (e as any).click_y_pct != null
    );

    // Count by device
    const dCounts = { desktop: 0, mobile: 0, tablet: 0 };
    for (const e of allClickEvents) {
      const d = (e.device_type || "desktop").toLowerCase();
      if (d in dCounts) dCounts[d as keyof typeof dCounts]++;
    }

    // Filter by device
    const clickEvents = deviceFilter === "all"
      ? allClickEvents
      : allClickEvents.filter(e => (e.device_type || "desktop").toLowerCase() === deviceFilter);

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
      deviceCounts: dCounts,
    };
  }, [events, deviceFilter]);

  if (totalClicks === 0 && deviceFilter === "all") {
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
      {/* Device filter */}
      <div className="flex items-center gap-3">
        <Tabs value={deviceFilter} onValueChange={(v) => setDeviceFilter(v as DeviceFilter)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs h-7 px-3">
              Todos ({deviceCounts.desktop + deviceCounts.mobile + deviceCounts.tablet})
            </TabsTrigger>
            <TabsTrigger value="desktop" className="text-xs h-7 px-3 gap-1">
              <Monitor className="h-3 w-3" /> {deviceCounts.desktop}
            </TabsTrigger>
            <TabsTrigger value="mobile" className="text-xs h-7 px-3 gap-1">
              <Smartphone className="h-3 w-3" /> {deviceCounts.mobile}
            </TabsTrigger>
            <TabsTrigger value="tablet" className="text-xs h-7 px-3 gap-1">
              <Tablet className="h-3 w-3" /> {deviceCounts.tablet}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
              <p className="text-sm text-muted-foreground">Sem dados{deviceFilter !== "all" ? ` para ${deviceFilter}` : ""}</p>
            ) : (
              <div className="space-y-2">
                {topElements.map((el, i) => {
                  const pct = totalClicks > 0 ? (el.count / totalClicks) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                        <span className="font-mono text-xs truncate">{el.element}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{el.count}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
