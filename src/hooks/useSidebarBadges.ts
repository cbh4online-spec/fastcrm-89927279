import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface SidebarBadges {
  pendingLeads: number;
  overdueInvoices: number;
  activitiesToday: number;
  pendingDecisions: number;
  overdueFollowups: number;
}

export function useSidebarBadges(): SidebarBadges {
  const { currentWorkspace } = useWorkspace();
  const [badges, setBadges] = useState<SidebarBadges>({
    pendingLeads: 0,
    overdueInvoices: 0,
    activitiesToday: 0,
    pendingDecisions: 0,
    overdueFollowups: 0,
  });

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchBadges = async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const [leadsRes, invoicesRes, activitiesRes, proposalsRes] = await Promise.all([
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", currentWorkspace.id)
          .eq("status", "new"),
        supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", currentWorkspace.id)
          .eq("status", "overdue"),
        supabase
          .from("crm_activities")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", currentWorkspace.id)
          .gte("created_at", startOfDay)
          .lt("created_at", endOfDay),
        supabase
          .from("proposals")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", currentWorkspace.id)
          .eq("status", "pending"),
      ]);

      setBadges({
        pendingLeads: leadsRes.count ?? 0,
        overdueInvoices: invoicesRes.count ?? 0,
        activitiesToday: activitiesRes.count ?? 0,
        pendingDecisions: proposalsRes.count ?? 0,
        overdueFollowups: invoicesRes.count ?? 0,
      });
    };

    fetchBadges();
    const interval = setInterval(fetchBadges, 60000);
    return () => clearInterval(interval);
  }, [currentWorkspace?.id]);

  return badges;
}
