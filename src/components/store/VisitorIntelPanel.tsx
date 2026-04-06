import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Clock, Monitor, MapPin, ShoppingCart, MousePointerClick, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { getTemperature, getTemperatureLabel, getTemperatureColor } from "@/hooks/useVisitorScore";

interface Props {
  sessionId: string;
  workspaceId: string;
}

export function VisitorIntelPanel({ sessionId, workspaceId }: Props) {
  const { data: session } = useQuery({
    queryKey: ["visitor_intel", workspaceId, sessionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("store_visitor_sessions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("session_id", sessionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId && !!sessionId,
  });

  if (!session) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 text-center">
          <User className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Sem dados do visitante</p>
        </CardContent>
      </Card>
    );
  }

  const score = session.visitor_score || 0;
  const temp = getTemperature(score);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Perfil do Visitante
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4">
            {/* Score */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Score</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${getTemperatureColor(temp)}`}>{score}</span>
                <Badge variant="outline" className="text-[10px]">
                  {getTemperatureLabel(temp)}
                </Badge>
              </div>
            </div>

            {/* Device */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Monitor className="h-3 w-3" /> Dispositivo
              </span>
              <span className="text-sm">{session.device_type || "—"}</span>
            </div>

            {/* Pages */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" /> Páginas
              </span>
              <span className="text-sm">{session.pages_viewed || 0}</span>
            </div>

            {/* Time on site */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Tempo no site
              </span>
              <span className="text-sm">
                {session.time_on_site_seconds
                  ? `${Math.floor(session.time_on_site_seconds / 60)}m ${session.time_on_site_seconds % 60}s`
                  : "—"}
              </span>
            </div>

            {/* Scroll depth */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MousePointerClick className="h-3 w-3" /> Scroll máx.
              </span>
              <span className="text-sm">{session.scroll_depth_max || 0}%</span>
            </div>

            {/* Source */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Fonte</span>
              <span className="text-sm truncate max-w-[150px]">
                {session.utm_source || session.referrer || "directo"}
              </span>
            </div>

            {/* Cart */}
            {session.cart_items && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" /> Carrinho
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {session.cart_subtotal ? `€${session.cart_subtotal}` : "activo"}
                </Badge>
              </div>
            )}

            {/* First page */}
            <div>
              <span className="text-xs text-muted-foreground">Primeira página</span>
              <p className="text-xs font-mono mt-0.5 truncate">{session.first_page || "—"}</p>
            </div>

            {/* Session start */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Início</span>
              <span className="text-xs text-muted-foreground">
                {session.started_at
                  ? formatDistanceToNow(new Date(session.started_at), { locale: pt, addSuffix: true })
                  : "—"}
              </span>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
