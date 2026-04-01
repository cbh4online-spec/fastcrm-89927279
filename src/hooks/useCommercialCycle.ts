import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface CommercialCycleData {
  opportunities: {
    total: number;
    open: number;
    won: number;
    lost: number;
    openValue: number;
    wonValue: number;
    winRate: number;
  };
  proposals: {
    total: number;
    sent: number;
    accepted: number;
    rejected: number;
  };
  invoices: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
  };
  lastActivityAt: string | null;
}

const EMPTY: CommercialCycleData = {
  opportunities: { total: 0, open: 0, won: 0, lost: 0, openValue: 0, wonValue: 0, winRate: 0 },
  proposals: { total: 0, sent: 0, accepted: 0, rejected: 0 },
  invoices: { total: 0, paid: 0, pending: 0, overdue: 0, totalRevenue: 0, paidRevenue: 0, pendingRevenue: 0 },
  lastActivityAt: null,
};

export function useCommercialCycle(entityType: "contact" | "company", entityId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["commercial-cycle", entityType, entityId, currentWorkspace?.id],
    queryFn: async (): Promise<CommercialCycleData> => {
      if (!entityId || !currentWorkspace) return EMPTY;

      const col = entityType === "contact" ? "contact_id" : "company_id";

      // Fetch opportunities
      const { data: opps } = await supabase
        .from("opportunities")
        .select("id, status, value, updated_at")
        .eq(col, entityId)
        .eq("workspace_id", currentWorkspace.id);

      const oppList = opps || [];
      const open = oppList.filter((o) => o.status === "open");
      const won = oppList.filter((o) => o.status === "won");
      const lost = oppList.filter((o) => o.status === "lost");
      const closedCount = won.length + lost.length;

      // Fetch proposals
      const { data: props } = await supabase
        .from("proposals")
        .select("id, status")
        .eq(col, entityId)
        .eq("workspace_id", currentWorkspace.id);

      const propList = props || [];

      // Fetch invoices
      const { data: invs } = await supabase
        .from("invoices")
        .select("id, status, total")
        .eq(col, entityId)
        .eq("workspace_id", currentWorkspace.id);

      const invList = invs || [];

      // Find last activity
      const allDates = oppList.map((o) => o.updated_at).filter(Boolean);
      const lastActivityAt = allDates.length > 0
        ? allDates.sort().reverse()[0]
        : null;

      return {
        opportunities: {
          total: oppList.length,
          open: open.length,
          won: won.length,
          lost: lost.length,
          openValue: open.reduce((s, o) => s + (Number(o.value) || 0), 0),
          wonValue: won.reduce((s, o) => s + (Number(o.value) || 0), 0),
          winRate: closedCount > 0 ? (won.length / closedCount) * 100 : 0,
        },
        proposals: {
          total: propList.length,
          sent: propList.filter((p) => p.status === "sent").length,
          accepted: propList.filter((p) => p.status === "accepted").length,
          rejected: propList.filter((p) => p.status === "rejected").length,
        },
        invoices: {
          total: invList.length,
          paid: invList.filter((i) => i.status === "paid").length,
          pending: invList.filter((i) => i.status === "unpaid" || i.status === "sent").length,
          overdue: invList.filter((i) => i.status === "overdue").length,
          totalRevenue: invList.reduce((s, i) => s + (Number(i.total) || 0), 0),
          paidRevenue: invList.filter((i) => i.status === "paid").reduce((s, i) => s + (Number(i.total) || 0), 0),
          pendingRevenue: invList.filter((i) => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + (Number(i.total) || 0), 0),
        },
        lastActivityAt,
      };
    },
    enabled: !!entityId && !!currentWorkspace,
  });
}
