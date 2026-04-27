import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Eye, MousePointerClick, Send, Users, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useBuilderAnalytics } from "@/modules/builder/hooks/useBuilderAnalytics";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assetId: string;
}

export function BuilderAnalyticsPanel({ open, onOpenChange, assetId }: Props) {
  const { data, isLoading } = useBuilderAnalytics(assetId);

  const kpis = useMemo(
    () => [
      { label: "Visitas", value: data?.totalViews ?? 0, icon: Eye },
      { label: "Sessões", value: data?.uniqueSessions ?? 0, icon: Users },
      { label: "Cliques", value: data?.totalClicks ?? 0, icon: MousePointerClick },
      { label: "Conversões", value: data?.totalFormSubmits ?? 0, icon: Send },
    ],
    [data],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Analytics
          </SheetTitle>
          <SheetDescription>
            Últimos 30 dias. Apenas eventos de visitantes que aceitaram cookies.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> A carregar…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {kpis.map((k) => (
                    <Card key={k.label}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{k.label}</span>
                          <k.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-semibold">{k.value.toLocaleString("pt-PT")}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Tráfego diário</span>
                      <span className="text-xs text-muted-foreground">
                        Taxa de conversão: {(data?.conversionRate ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data?.byDay ?? []}>
                          <defs>
                            <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(d) => d.slice(5)}
                          />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--popover))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 6,
                              fontSize: 12,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="views"
                            stroke="hsl(var(--primary))"
                            fill="url(#gv)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium mb-3">Top referrers</h4>
                      {data?.topReferrers.length === 0 && (
                        <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
                      )}
                      <ul className="space-y-1.5">
                        {data?.topReferrers.map((r) => (
                          <li
                            key={r.referrer}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="truncate font-mono">{r.referrer}</span>
                            <span className="text-muted-foreground">{r.count}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium mb-3">Top páginas</h4>
                      {data?.topPaths.length === 0 && (
                        <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
                      )}
                      <ul className="space-y-1.5">
                        {data?.topPaths.map((r) => (
                          <li
                            key={r.path}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="truncate font-mono">{r.path}</span>
                            <span className="text-muted-foreground">{r.count}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
