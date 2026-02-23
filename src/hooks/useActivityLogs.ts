import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityLog {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  table_name: string;
  record_id: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  module: string | null;
  created_at: string;
  profile?: { full_name: string | null; email: string | null } | null;
}

export interface ActivityLogFilters {
  module?: string;
  action?: string;
  userId?: string;
  tableName?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

const PAGE_SIZE = 50;

export function useActivityLogs(filters: ActivityLogFilters = {}) {
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ["activity-logs", filters, page],
    queryFn: async () => {
      let q = supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filters.module) q = q.eq("module", filters.module);
      if (filters.action) q = q.eq("action", filters.action);
      if (filters.userId) q = q.eq("user_id", filters.userId);
      if (filters.tableName) q = q.eq("table_name", filters.tableName);
      if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom);
      if (filters.dateTo) q = q.lte("created_at", filters.dateTo);
      if (filters.search) q = q.or(`record_id.eq.${filters.search},table_name.ilike.%${filters.search}%`);

      const { data, error, count } = await q;
      if (error) throw error;

      // Fetch profiles for user_ids
      const userIds = [...new Set((data || []).map((l: any) => l.user_id).filter(Boolean))];
      let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]));
        }
      }

      const logs: ActivityLog[] = (data || []).map((l: any) => ({
        ...l,
        profile: l.user_id ? profilesMap[l.user_id] || null : null,
      }));

      return { logs, total: count || 0 };
    },
  });

  return {
    ...query,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil((query.data?.total || 0) / PAGE_SIZE),
  };
}
