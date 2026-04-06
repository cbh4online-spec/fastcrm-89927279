import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { User, Clock, Monitor, ShoppingCart, MousePointerClick, Eye, Globe, FileText, MessageSquare } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";
import { getTemperature, getTemperatureLabel, getTemperatureColor } from "@/hooks/useVisitorScore";

interface Props {
  sessionId: string;
  workspaceId: string;
}

export function VisitorIntelPanel({ sessionId, workspaceId }: Props) {
  // Session data
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

  // Page views trail
  const { data: pageViews = [] } = useQuery({
    queryKey: ["visitor_pages", workspaceId, sessionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("store_page_views")
        .select("id, page_url, product_id, created_at")
        .eq("workspace_id", workspaceId)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId && !!sessionId,
  });

  // Chat conversations for this session
  const { data: chatMessages = [] } = useQuery({
    queryKey: ["visitor_chats", workspaceId, sessionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("chat_conversations")
        .select("id, visitor_name, status, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) return [];
      return data || [];
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
          <Badge variant="outline" className={`text-[10px] ${getTemperatureColor(temp)}`}>
            {getTemperatureLabel(temp)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[500px]">
          <div className="px-6 pb-4 space-y-3">
            {/* Score bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Score</span>
                <span className={`text-lg font-bold ${getTemperatureColor(temp)}`}>{score}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${score}%`,
                    backgroundColor: temp === "hot" ? "hsl(0, 70%, 50%)" : temp === "warm" ? "hsl(35, 80%, 50%)" : "hsl(210, 70%, 50%)",
                  }}
                />
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <Monitor className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">{session.device_type || "—"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">{session.pages_viewed || 0} páginas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">
                  {session.time_on_site_seconds
                    ? `${Math.floor(session.time_on_site_seconds / 60)}m ${session.time_on_site_seconds % 60}s`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">Scroll {session.scroll_depth_max || 0}%</span>
              </div>
            </div>

            {/* Source */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Fonte
              </span>
              <span className="text-xs truncate max-w-[150px]">
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

            {/* Page Trail */}
            {pageViews.length > 0 && (
              <>
                <Separator className="my-2" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Percurso de Navegação
                  </p>
                  <div className="space-y-1 max-h-[140px] overflow-y-auto">
                    {pageViews.map((pv: any, i: number) => (
                      <div key={pv.id} className="flex items-start gap-2">
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${i === pageViews.length - 1 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          {i < pageViews.length - 1 && <div className="w-px h-4 bg-border/50" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-mono truncate">
                            {pv.page_url || (pv.product_id ? `Produto` : "/")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(pv.created_at), "HH:mm:ss")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Chat History */}
            {chatMessages.length > 0 && (
              <>
                <Separator className="my-2" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Conversas
                  </p>
                  <div className="space-y-1.5">
                    {chatMessages.map((chat: any) => (
                      <div key={chat.id} className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs truncate">{chat.visitor_name || "Visitante"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(chat.created_at), { locale: pt, addSuffix: true })}
                          </p>
                        </div>
                        <Badge
                          variant={chat.status === "open" ? "default" : "secondary"}
                          className="text-[10px] shrink-0"
                        >
                          {chat.status === "open" ? "Aberta" : chat.status === "closed" ? "Fechada" : chat.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Session start */}
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Início da sessão</span>
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
