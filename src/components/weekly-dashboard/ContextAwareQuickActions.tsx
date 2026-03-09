import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, Mail, RotateCcw } from "lucide-react";

export function ContextAwareQuickActions() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const { data: counts } = useQuery({
    queryKey: ["quick-action-counts", wid],
    enabled: !!wid,
    staleTime: 60_000,
    queryFn: async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [hotLeadsRes, stalledRes, proposalsRes] = await Promise.all([
        // Hot leads: score >= 80, no contact in 3 days
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", wid!)
          .gte("lead_score", 80)
          .lt("updated_at", threeDaysAgo),
        // Stalled deals: open/active, not updated in 7 days
        supabase
          .from("opportunities")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", wid!)
          .in("status", ["open", "active"])
          .lt("updated_at", sevenDaysAgo),
        // Proposals viewed but unanswered
        supabase
          .from("proposals")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", wid!)
          .eq("status", "published")
          .not("viewed_at", "is", null),
      ]);

      return {
        hotLeads: hotLeadsRes.count ?? 0,
        stalledDeals: stalledRes.count ?? 0,
        followUps: proposalsRes.count ?? 0,
      };
    },
  });

  const actions = [
    {
      label: "Ligar Leads Hot",
      count: counts?.hotLeads ?? 0,
      icon: Phone,
      onClick: () => navigate("/dashboard/leads?filter=hot"),
    },
    {
      label: "Agendar Reunião",
      count: null,
      icon: Calendar,
      onClick: () => navigate("/dashboard/scheduling"),
    },
    {
      label: "Enviar Follow-up",
      count: counts?.followUps ?? 0,
      icon: Mail,
      onClick: () => navigate("/dashboard/inbox"),
    },
    {
      label: "Reativar Deals",
      count: counts?.stalledDeals ?? 0,
      icon: RotateCcw,
      onClick: () => navigate("/dashboard/opportunities?filter=stalled"),
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button key={a.label} variant="outline" size="sm" onClick={a.onClick} className="gap-2">
          <a.icon className="h-3.5 w-3.5" />
          {a.count != null && a.count > 0 ? `${a.label} (${a.count})` : a.label}
          {a.count != null && a.count > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
              {a.count}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
}
