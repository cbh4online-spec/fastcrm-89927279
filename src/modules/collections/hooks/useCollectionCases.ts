import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { CollectionCaseListFilters, CollectionCaseRow } from "../types/collections";

const PAGE_SIZE = 50;

export function useCollectionCases(filters: CollectionCaseListFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["collection-cases", workspaceId, filters],
    enabled: !!workspaceId,
    queryFn: async (): Promise<CollectionCaseRow[]> => {
      if (!workspaceId) return [];
      let q = supabase
        .from("collection_cases")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .limit(PAGE_SIZE);

      if (filters.status?.length) q = q.in("status", filters.status);
      if (filters.assignedTo) q = q.eq("assigned_to", filters.assignedTo);
      if (typeof filters.minOverdueDays === "number" && filters.minOverdueDays > 0)
        q = q.gte("days_overdue", filters.minOverdueDays);
      if (typeof filters.minAmount === "number" && filters.minAmount > 0)
        q = q.gte("total_due", filters.minAmount);
      if (filters.search?.trim()) q = q.ilike("debtor_name", `%${filters.search.trim()}%`);

      const orderField = filters.orderBy ?? "total_due";
      const asc = orderField === "oldest_due_date";
      q = q.order(orderField, { ascending: asc, nullsFirst: false });

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CollectionCaseRow[];
    },
  });
}
