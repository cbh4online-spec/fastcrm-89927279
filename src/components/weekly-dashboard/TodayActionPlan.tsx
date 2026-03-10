import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, ArrowRight, Phone, Mail, Calendar, RotateCcw, ExternalLink, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("dashboard");
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
        supabase
          .from("leads")
          .select("id, name, lead_score")
          .eq("workspace_id", wid)
          .gte("lead_score", 80)
          .lt("updated_at", threeDaysAgo)
          .order("lead_score", { ascending: false })
          .limit(3),
        supabase
          .from("opportunities")
          .select("id, title, value")
          .eq("workspace_id", wid)
          .in("status", ["open", "active"])
          .lt("updated_at", sevenDaysAgo)
          .order("value", { ascending: false })
          .limit(3),
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

      for (const lead of (hotLeadsRes.data ?? []) as any[]) {
        items.push({
          id: `lead-${lead.id}`,
          type: "hot_lead",
          title: t("callLead", { name: lead.name || "lead" }),
          subtitle: t("leadScoreLabel", { score: lead.lead_score }),
          icon: Phone,
          route: `/dashboard/leads/${lead.id}`,
          urgency: "high",
        });
      }

      for (const prop of (proposalsRes.data ?? []) as any[]) {
        items.push({
          id: `prop-${prop.id}`,
          type: "proposal_viewed",
          title: t("followUpProposal", { title: prop.title || "" }).trim(),
          subtitle: t("viewsCount", { count: prop.views_count }),
          icon: Mail,
          route: prop.opportunity_id ? `/dashboard/opportunities/${prop.opportunity_id}` : `/dashboard/inbox`,
          urgency: "high",
        });
      }

      for (const deal of (stalledRes.data ?? []) as any[]) {
        items.push({
          id: `deal-${deal.id}`,
          type: "stalled_deal",
          title: t("reactivateDeal", { title: deal.title || "deal" }),
          subtitle: deal.value ? `€${deal.value.toLocaleString()}` : t("noValue"),
          icon: RotateCcw,
          route: `/dashboard/opportunities/${deal.id}`,
          urgency: "medium",
        });
      }

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
            <Zap className="h-4 w-4 text-primary" /> {t("todayActionPlan")}
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
            <Zap className="h-4 w-4 text-primary" /> {t("todayActionPlan")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 mb-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{t("noActionsToday")}</p>
            <p className="text-xs text-muted-foreground max-w-xs">{t("noActionsTodayHint")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> {t("todayActionPlan")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1"
            onClick={() => navigate("/dashboard/tasks")}
          >
            {t("viewAll")} <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          {t("todayRecommends", { count: actions.length })}
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
