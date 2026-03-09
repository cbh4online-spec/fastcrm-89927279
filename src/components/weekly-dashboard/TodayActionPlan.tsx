import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, ArrowRight, Phone, Mail, Calendar, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionItem {
  id: string;
  type: "hot_lead" | "stalled_deal" | "proposal_viewed" | "meeting_followup";
  title: string;
  subtitle: string;
  icon: typeof Phone;
  route: string;
  urgency: "high" | "medium" | "low";
}

export function TodayActionPlan() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["today-action-plan", wid],
    enabled: !!wid,
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async (): Promise<ActionItem[]> => {
      if (!wid) return [];
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [hotLeadsRes, stalledRes, proposalsRes] = await Promise.all([
        // Hot leads not contacted recently
        supabase
          .from("leads")
          .select("id, name, lead_score")
          .eq("workspace_id", wid)
          .gte("lead_score", 80)
          .lt("updated_at", threeDaysAgo)
          .order("lead_score", { ascending: false })
          .limit(3),
        // Stalled deals
        supabase
          .from("opportunities")
          .select("id, title, value")
          .eq("workspace_id", wid)
          .in("status", ["open", "active"])
          .lt("updated_at", sevenDaysAgo)
          .order("value", { ascending: false })
          .limit(3),
        // Proposals viewed (high view count)
        supabase
          .from("proposals")
          .select("id, title, opportunity_id, views_count")
          .eq("workspace_id", wid)
          .eq("status", "published")
          .gt("views_count", 0)
          .order("views_count", { ascending: false })
          .limit(2),
      ]);

      const items: ActionItem[] = [];

      // Hot leads
      for (const lead of (hotLeadsRes.data ?? []) as any[]) {
        items.push({
          id: `lead-${lead.id}`,
          type: "hot_lead",
          title: `Ligar ${lead.name || "lead"}`,
          subtitle: `Lead score ${lead.lead_score}`,
          icon: Phone,
          route: `/dashboard/leads/${lead.id}`,
          urgency: "high",
        });
      }

      // Proposals viewed
      for (const prop of (proposalsRes.data ?? []) as any[]) {
        items.push({
          id: `prop-${prop.id}`,
          type: "proposal_viewed",
          title: `Follow-up proposta ${prop.title || ""}`.trim(),
          subtitle: `${prop.views_count} visualizações`,
          icon: Mail,
          route: prop.opportunity_id ? `/dashboard/opportunities/${prop.opportunity_id}` : `/dashboard/inbox`,
          urgency: "high",
        });
      }

      // Stalled deals
      for (const deal of (stalledRes.data ?? []) as any[]) {
        items.push({
          id: `deal-${deal.id}`,
          type: "stalled_deal",
          title: `Reativar ${deal.title || "deal"}`,
          subtitle: deal.value ? `€${deal.value.toLocaleString()}` : "Sem valor",
          icon: RotateCcw,
          route: `/dashboard/opportunities/${deal.id}`,
          urgency: "medium",
        });
      }

      // Sort by urgency
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

      return items.slice(0, 5);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Plano de Ação — Hoje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Plano de Ação — Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem ações urgentes recomendadas para hoje. Pipeline estável.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Plano de Ação — Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Hoje o sistema recomenda {actions.length} ações prioritárias:
        </p>
        <div className="space-y-1">
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                className="w-full flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
                onClick={() => navigate(action.route)}
              >
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  action.urgency === "high" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                )}>
                  {i + 1}
                </span>
                <div className={cn(
                  "p-1.5 rounded-md shrink-0",
                  action.urgency === "high" ? "bg-destructive/10" : "bg-primary/10"
                )}>
                  <Icon className={cn(
                    "h-3.5 w-3.5",
                    action.urgency === "high" ? "text-destructive" : "text-primary"
                  )} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{action.title}</p>
                  <p className="text-[10px] text-muted-foreground">{action.subtitle}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
