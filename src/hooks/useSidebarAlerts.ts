import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface SidebarAlert {
  id: string;
  type: "stalled_deals" | "quota_risk" | "overdue_followups";
  message: string;
  count: number;
  severity: "danger" | "warning";
}

export function useSidebarAlerts(): SidebarAlert[] {
  const { currentWorkspace } = useWorkspace();
  const [alerts, setAlerts] = useState<SidebarAlert[]>([]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchAlerts = async () => {
      const result: SidebarAlert[] = [];

      // 1. Deals stalled > 5 days
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const { count: stalledCount } = await supabase
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .not("stage", "in", '("won","lost")')
        .lt("updated_at", fiveDaysAgo.toISOString());

      if (stalledCount && stalledCount > 0) {
        result.push({
          id: "stalled_deals",
          type: "stalled_deals",
          message: `${stalledCount} deal${stalledCount > 1 ? "s" : ""} parado${stalledCount > 1 ? "s" : ""} há 5+ dias`,
          count: stalledCount,
          severity: stalledCount > 3 ? "danger" : "warning",
        });
      }

      // 2. Overdue invoices
      const { count: overdueCount } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "overdue");

      if (overdueCount && overdueCount > 0) {
        result.push({
          id: "overdue_invoices",
          type: "overdue_followups",
          message: `${overdueCount} fatura${overdueCount > 1 ? "s" : ""} em atraso`,
          count: overdueCount,
          severity: overdueCount > 3 ? "danger" : "warning",
        });
      }

      setAlerts(result);
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 120_000);
    return () => clearInterval(interval);
  }, [currentWorkspace?.id]);

  return alerts;
}
