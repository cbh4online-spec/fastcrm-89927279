import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Users, Monitor, Smartphone, Tablet, Eye, ShoppingCart, Brain, Timer, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { getTemperature, getTemperatureLabel, getTemperatureColor, type VisitorTemperature } from "@/hooks/useVisitorScore";
import { VisitorIntelPanel } from "./VisitorIntelPanel";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const DEVICE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const INTENT_LABELS: Record<string, { label: string; color: string }> = {
  browsing: { label: "Explorar", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  comparing: { label: "Comparar", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  ready_to_buy: { label: "Comprar", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  returning_customer: { label: "Recorrente", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
};

type FilterType = "all" | "hot" | "cart";

function formatTimeShort(seconds: number): string {
  if (!seconds) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m`;
}

export function ActiveVisitorsList() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ["active_visitors", workspaceId],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("store_visitor_sessions")
        .select("session_id, device_type, pages_viewed, visitor_score, first_page, started_at, last_activity_at, utm_source, referrer, scroll_depth_max, time_on_site_seconds, ai_intent, ai_score, cart_items, cart_subtotal")
        .eq("workspace_id", workspaceId)
        .gt("last_activity_at", fiveMinAgo)
        .order("last_activity_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
    refetchInterval: 15000,
  });

  // Group and filter
  const { grouped, stats } = useMemo(() => {
    const all = visitors as any[];
    const hot = all.filter((v) => getTemperature(v.visitor_score || 0) === "hot");
    const warm = all.filter((v) => getTemperature(v.visitor_score || 0) === "warm");
    const cold = all.filter((v) => getTemperature(v.visitor_score || 0) === "cold");
    const withCart = all.filter((v) => v.cart_items);
    const avgScore = all.length > 0
      ? Math.round(all.reduce((s, v) => s + (v.visitor_score || 0), 0) / all.length)
      : 0;

    let filtered = all;
    if (filter === "hot") filtered = hot;
    else if (filter === "cart") filtered = withCart;

    // Group filtered by temperature
    const groupedHot = filtered.filter((v) => getTemperature(v.visitor_score || 0) === "hot");
    const groupedWarm = filtered.filter((v) => getTemperature(v.visitor_score || 0) === "warm");
    const groupedCold = filtered.filter((v) => getTemperature(v.visitor_score || 0) === "cold");

    return {
      grouped: [
        { label: "🔥 Quentes", temp: "hot" as VisitorTemperature, items: groupedHot },
        { label: "🌡️ Mornos", temp: "warm" as VisitorTemperature, items: groupedWarm },
        { label: "❄️ Frios", temp: "cold" as VisitorTemperature, items: groupedCold },
      ].filter((g) => g.items.length > 0),
      stats: { total: all.length, hot: hot.length, withCart: withCart.length, avgScore },
    };
  }, [visitors, filter]);

  if (!workspaceId) return null;

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "Todos", count: stats.total },
    { key: "hot", label: "Quentes", count: stats.hot },
    { key: "cart", label: "Carrinho", count: stats.withCart },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          Visitantes Activos
          <Badge variant="secondary" className="text-[10px]">
            {stats.total} online
          </Badge>
        </CardTitle>
        {/* Mini KPIs */}
        {stats.total > 0 && (
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Score médio: <span className="font-medium text-foreground">{stats.avgScore}</span></span>
            </div>
            {stats.withCart > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShoppingCart className="h-3 w-3" />
                <span>{stats.withCart} com carrinho</span>
              </div>
            )}
          </div>
        )}
        {/* Filters */}
        <div className="flex gap-1.5 mt-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                filter === f.key
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
              }`}
            >
              {f.label} {f.count !== undefined && f.count > 0 ? `(${f.count})` : ""}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
            ))}
          </div>
        ) : stats.total === 0 ? (
          <div className="py-8 text-center">
            <Eye className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum visitante activo</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <div className="space-y-3">
              {grouped.map((group) => (
                <div key={group.temp}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1 px-1">{group.label} ({group.items.length})</p>
                  <div className="space-y-0.5">
                    {group.items.map((v: any) => {
                      const score = v.visitor_score || 0;
                      const temp = getTemperature(score);
                      const DevIcon = DEVICE_ICON[v.device_type?.toLowerCase()] || Monitor;
                      const isRecentlyActive = v.last_activity_at && (Date.now() - new Date(v.last_activity_at).getTime()) < 60000;
                      const intentInfo = v.ai_intent ? INTENT_LABELS[v.ai_intent] : null;

                      return (
                        <Sheet key={v.session_id}>
                          <SheetTrigger asChild>
                            <button
                              className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/30 transition-colors text-left"
                              onClick={() => setSelectedSession(v.session_id)}
                            >
                              {/* Pulsing/static dot */}
                              <div className="relative shrink-0">
                                <div className={`w-2 h-2 rounded-full ${temp === "hot" ? "bg-red-400" : temp === "warm" ? "bg-amber-400" : "bg-blue-400"}`} />
                                {isRecentlyActive && (
                                  <div className={`absolute inset-0 w-2 h-2 rounded-full animate-ping ${temp === "hot" ? "bg-red-400" : temp === "warm" ? "bg-amber-400" : "bg-blue-400"}`} />
                                )}
                              </div>

                              <DevIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-mono truncate">{v.first_page || "/"}</span>
                                  {/* Score bar */}
                                  <div className="w-12 h-1 rounded-full bg-muted/30 overflow-hidden shrink-0">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${score}%`,
                                        backgroundColor: temp === "hot" ? "hsl(0, 70%, 50%)" : temp === "warm" ? "hsl(35, 80%, 50%)" : "hsl(210, 70%, 50%)",
                                      }}
                                    />
                                  </div>
                                  <span className={`text-[9px] font-medium shrink-0 ${getTemperatureColor(temp)}`}>{score}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                                  <span>{v.pages_viewed || 0} pág.</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5">
                                    <Timer className="h-2.5 w-2.5" />
                                    {formatTimeShort(v.time_on_site_seconds)}
                                  </span>
                                  {intentInfo && (
                                    <>
                                      <span>•</span>
                                      <span className={`inline-flex items-center gap-0.5 px-1 py-px rounded text-[9px] border ${intentInfo.color}`}>
                                        <Brain className="h-2.5 w-2.5" />
                                        {intentInfo.label}
                                      </span>
                                    </>
                                  )}
                                  {v.cart_subtotal && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-0.5 text-green-400">
                                        <ShoppingCart className="h-2.5 w-2.5" />
                                        €{v.cart_subtotal}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          </SheetTrigger>
                          <SheetContent className="w-[380px] sm:w-[420px]">
                            <SheetHeader>
                              <SheetTitle className="text-sm">Detalhes do Visitante</SheetTitle>
                            </SheetHeader>
                            <div className="mt-4">
                              <VisitorIntelPanel sessionId={v.session_id} workspaceId={workspaceId} />
                            </div>
                          </SheetContent>
                        </Sheet>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
