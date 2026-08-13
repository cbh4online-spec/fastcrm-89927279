import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface CollectionsKPIs {
  totalOpen: number;
  casesOpen: number;
  recovered30d: number;
  avgOverdueDays: number;
  aging: { label: string; amount: number; count: number }[];
  actionsSent30d: number;
  actionsFailed30d: number;
}

const BUCKETS: Array<{ label: string; min: number; max: number }> = [
  { label: "0–30 dias", min: 0, max: 30 },
  { label: "31–60 dias", min: 31, max: 60 },
  { label: "61–90 dias", min: 61, max: 90 },
  { label: "> 90 dias", min: 91, max: Number.MAX_SAFE_INTEGER },
];

export function useCollectionsKPIs() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["collections-kpis", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<CollectionsKPIs> => {
      const wsId = currentWorkspace!.id;
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceIso = since.toISOString();

      const [casesRes, actionsRes] = await Promise.all([
        supabase
          .from("collection_cases")
          .select("status, total_due, total_paid, days_overdue, updated_at")
          .eq("workspace_id", wsId)
          .is("deleted_at", null),
        supabase
          .from("collection_actions")
          .select("metadata, created_at")
          .eq("workspace_id", wsId)
          .gte("created_at", sinceIso)
          .limit(1000),
      ]);

      if (casesRes.error) throw casesRes.error;
      if (actionsRes.error) throw actionsRes.error;

      const rows = casesRes.data ?? [];
      const open = rows.filter((r) => !["paid", "closed"].includes(String(r.status)));

      const aging = BUCKETS.map((b) => {
        const inBucket = open.filter((r) => {
          const d = Number(r.days_overdue ?? 0);
          return d >= b.min && d <= b.max;
        });
        return {
          label: b.label,
          count: inBucket.length,
          amount: inBucket.reduce(
            (s, r) => s + (Number(r.total_due ?? 0) - Number(r.total_paid ?? 0)),
            0,
          ),
        };
      });

      const totalOpen = open.reduce(
        (s, r) => s + (Number(r.total_due ?? 0) - Number(r.total_paid ?? 0)),
        0,
      );

      const recovered30d = rows
        .filter((r) => r.updated_at && r.updated_at >= sinceIso)
        .reduce((s, r) => s + Number(r.total_paid ?? 0), 0);

      const avgOverdueDays = open.length
        ? Math.round(open.reduce((s, r) => s + Number(r.days_overdue ?? 0), 0) / open.length)
        : 0;

      const actions = actionsRes.data ?? [];
      const statusOf = (m: unknown) =>
        (m as { delivery?: { status?: string } } | null)?.delivery?.status;

      return {
        totalOpen,
        casesOpen: open.length,
        recovered30d,
        avgOverdueDays,
        aging,
        actionsSent30d: actions.filter((a) => statusOf(a.metadata) === "sent").length,
        actionsFailed30d: actions.filter((a) => statusOf(a.metadata) === "failed").length,
      };
    },
  });
}
