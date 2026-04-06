import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Clock, Users, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function ChatAnalyticsTab() {
  const { currentWorkspace } = useWorkspace();

  const { data: conversations = [] } = useQuery({
    queryKey: ["chat_analytics", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("chat_conversations")
        .select("id, created_at, status, messages:chat_messages(id, role, created_at)")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const metrics = useMemo(() => {
    const total = conversations.length;
    const resolved = conversations.filter((c: any) => c.status === "resolved").length;

    let totalResponseTime = 0;
    let responseCount = 0;

    for (const conv of conversations) {
      const messages = (conv as any).messages || [];
      const sorted = [...messages].sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
      
      // Find first user message and first assistant response
      const firstUser = sorted.find((m: any) => m.role === "user");
      const firstAssistant = sorted.find((m: any) => m.role === "assistant" && firstUser && m.created_at > firstUser.created_at);
      
      if (firstUser && firstAssistant) {
        const diff = new Date(firstAssistant.created_at).getTime() - new Date(firstUser.created_at).getTime();
        totalResponseTime += diff;
        responseCount++;
      }
    }

    const avgResponseMs = responseCount > 0 ? totalResponseTime / responseCount : 0;
    const avgResponseSec = Math.round(avgResponseMs / 1000);

    // Volume by hour
    const byHour: Record<number, number> = {};
    for (const conv of conversations) {
      const hour = new Date((conv as any).created_at).getHours();
      byHour[hour] = (byHour[hour] || 0) + 1;
    }

    const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      resolved,
      resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
      avgResponseSec,
      peakHour: peakHour ? `${peakHour[0]}h` : "—",
      peakHourCount: peakHour ? peakHour[1] : 0,
    };
  }, [conversations]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> Total Conversas
            </p>
            <p className="text-2xl font-bold">{metrics.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Taxa Resolução
            </p>
            <p className="text-2xl font-bold">{metrics.resolutionRate.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Tempo Médio Resposta
            </p>
            <p className="text-2xl font-bold">{metrics.avgResponseSec}s</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Hora de Pico
            </p>
            <p className="text-2xl font-bold">{metrics.peakHour}</p>
            <p className="text-xs text-muted-foreground">{metrics.peakHourCount} conversas</p>
          </CardContent>
        </Card>
      </div>

      {conversations.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              Sem conversas de chat registadas ainda.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
