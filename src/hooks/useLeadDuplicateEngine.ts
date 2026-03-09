import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface DuplicateGroup {
  id: string;
  workspace_id: string;
  confidence_score: number;
  duplicate_reason: string;
  match_type: string;
  matched_fields: string[];
  status: string;
  created_at: string;
  updated_at: string;
  items: DuplicateGroupItem[];
}

export interface DuplicateGroupItem {
  id: string;
  group_id: string;
  lead_id: string;
  is_master_candidate: boolean;
  created_at: string;
  lead?: any; // full lead data
}

export function useLeadDuplicateGroupsPersisted() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["lead-duplicate-groups-persisted", wid],
    enabled: !!wid,
    staleTime: 60_000,
    queryFn: async (): Promise<DuplicateGroup[]> => {
      if (!wid) return [];

      const { data: groups, error } = await supabase
        .from("lead_duplicate_groups")
        .select("*")
        .eq("workspace_id", wid)
        .in("status", ["pending", "reviewing"])
        .order("confidence_score", { ascending: false });

      if (error) throw error;
      if (!groups?.length) return [];

      // Fetch items for all groups
      const groupIds = groups.map(g => g.id);
      const { data: items, error: itemsErr } = await supabase
        .from("lead_duplicate_group_items")
        .select("*")
        .in("group_id", groupIds);

      if (itemsErr) throw itemsErr;

      // Fetch lead data for all items
      const leadIds = [...new Set((items || []).map(i => i.lead_id))];
      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .in("id", leadIds)
        .is("deleted_at", null);

      const leadMap = new Map((leads || []).map(l => [l.id, l]));

      // Also fetch relation counts
      const [opps, convs] = await Promise.all([
        supabase.from("opportunities").select("id, lead_id").in("lead_id", leadIds),
        supabase.from("conversations").select("id, lead_id").in("lead_id", leadIds),
      ]);

      const oppCounts = new Map<string, number>();
      const convCounts = new Map<string, number>();
      (opps.data || []).forEach((o: any) => oppCounts.set(o.lead_id, (oppCounts.get(o.lead_id) || 0) + 1));
      (convs.data || []).forEach((c: any) => convCounts.set(c.lead_id, (convCounts.get(c.lead_id) || 0) + 1));

      return groups.map(g => ({
        ...g,
        matched_fields: g.matched_fields || [],
        items: (items || [])
          .filter(i => i.group_id === g.id)
          .map(i => ({
            ...i,
            lead: {
              ...leadMap.get(i.lead_id),
              _relatedCounts: {
                opportunities: oppCounts.get(i.lead_id) || 0,
                conversations: convCounts.get(i.lead_id) || 0,
              },
            },
          }))
          .filter(i => i.lead?.id), // Only include items where lead still exists
      })).filter(g => g.items.length >= 2) as DuplicateGroup[];
    },
  });
}

export function useDetectLeadDuplicates() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("detect-lead-duplicates", {
        body: { workspace_id: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lead-duplicate-groups-persisted"] });
      toast.success(`Scan concluído: ${data.groups} grupo(s) de duplicados encontrados`);
    },
    onError: (err: any) => {
      const msg = err?.message || "Erro ao detetar duplicados";
      toast.error(msg);
      console.error("Detect duplicates error:", err);
    },
  });
}

export function useMergeLeads() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      master_lead_id: string;
      merged_lead_ids: string[];
      field_selections?: Record<string, string>;
      group_id?: string;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("merge-leads", {
        body: { workspace_id: currentWorkspace.id, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lead-duplicate-groups-persisted"] });
      queryClient.invalidateQueries({ queryKey: ["lead-duplicate-groups"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["smart-leads"] });
      toast.success(`${data.merged_count} lead(s) fundido(s) com sucesso`);
    },
    onError: (err) => {
      toast.error("Erro ao fundir leads");
      console.error(err);
    },
  });
}

export function useUpdateDuplicateGroupStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, status }: { groupId: string; status: string }) => {
      const { error } = await supabase
        .from("lead_duplicate_groups")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-duplicate-groups-persisted"] });
    },
  });
}

export function useMergeAuditLog() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["lead-merge-audit", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_merge_audit")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}
