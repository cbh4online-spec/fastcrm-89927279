import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Users, Monitor, Smartphone, Tablet, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { getTemperature, getTemperatureLabel, getTemperatureColor } from "@/hooks/useVisitorScore";
import { VisitorIntelPanel } from "./VisitorIntelPanel";
import { useWorkspace } from "@/hooks/useWorkspace";

const DEVICE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export function ActiveVisitorsList() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ["active_visitors", workspaceId],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("store_visitor_sessions")
        .select("session_id, device_type, pages_viewed, visitor_score, first_page, started_at, last_activity_at, utm_source, referrer, scroll_depth_max, time_on_site_seconds")
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

  if (!workspaceId) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          Visitantes Activos
          <Badge variant="secondary" className="text-[10px]">
            {visitors.length} online
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
            ))}
          </div>
        ) : visitors.length === 0 ? (
          <div className="py-8 text-center">
            <Eye className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum visitante activo</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {visitors.map((v: any) => {
                const score = v.visitor_score || 0;
                const temp = getTemperature(score);
                const DevIcon = DEVICE_ICON[v.device_type?.toLowerCase()] || Monitor;

                return (
                  <Sheet key={v.session_id}>
                    <SheetTrigger asChild>
                      <button
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors text-left"
                        onClick={() => setSelectedSession(v.session_id)}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${temp === "hot" ? "bg-red-400" : temp === "warm" ? "bg-amber-400" : "bg-blue-400"}`} />
                        <DevIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono truncate">
                              {v.first_page || "/"}
                            </span>
                            <Badge variant="outline" className={`text-[9px] shrink-0 ${getTemperatureColor(temp)}`}>
                              {score}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{v.pages_viewed || 0} pág.</span>
                            <span>•</span>
                            <span>{v.utm_source || "directo"}</span>
                            <span>•</span>
                            <span>
                              {v.last_activity_at
                                ? formatDistanceToNow(new Date(v.last_activity_at), { locale: pt, addSuffix: true })
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </button>
                    </SheetTrigger>
                    <SheetContent className="w-[380px] sm:w-[420px]">
                      <SheetHeader>
                        <SheetTitle className="text-sm">Detalhes do Visitante</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4">
                        <VisitorIntelPanel
                          sessionId={v.session_id}
                          workspaceId={workspaceId}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
