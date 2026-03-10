import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface SidebarBadges {
  pendingLeads: number;
  overdueInvoices: number;
}

export function useSidebarBadges(): SidebarBadges {
  const { currentWorkspace } = useWorkspace();
  const [badges, setBadges] = useState<SidebarBadges>({ pendingLeads: 0, overdueInvoices: 0 });

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchBadges = async () => {
      const [leadsRes, invoicesRes] = await Promise.all([
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
      ]);

      setBadges({
        pendingLeads: leadsRes.count ?? 0,
        overdueInvoices: invoicesRes.count ?? 0,
      });
    };

    fetchBadges();

    // Refresh every 60s
    const interval = setInterval(fetchBadges, 60000);
    return () => clearInterval(interval);
  }, [currentWorkspace?.id]);

  return badges;
}
