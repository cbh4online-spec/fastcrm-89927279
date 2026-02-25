import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ObjectRelationship {
  id: string;
  workspace_id: string;
  source_object_id: string;
  source_record_id: string;
  target_object_id: string;
  target_record_id: string;
  relationship_type: string;
  created_at: string;
  // Resolved display data
  source_object_name?: string;
  source_record_data?: Record<string, unknown>;
  target_object_name?: string;
  target_record_data?: Record<string, unknown>;
  target_object_icon?: string;
  target_object_slug?: string;
  source_object_icon?: string;
  source_object_slug?: string;
}

export function useObjectRelationships(recordId: string | null) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["object-relationships", currentWorkspace?.id, recordId],
    queryFn: async () => {
      if (!currentWorkspace || !recordId) return [];

      // Get relationships where this record is source or target
      const { data: rels, error } = await (supabase
        .from("object_relationships")
        .select("*") as any)
        .eq("workspace_id", currentWorkspace.id)
        .or(`source_record_id.eq.${recordId},target_record_id.eq.${recordId}`);

      if (error) throw error;
      if (!rels || rels.length === 0) return [];

      // Collect unique object IDs and record IDs to resolve
      const objectIds = new Set<string>();
      const recordIds = new Set<string>();
      for (const r of rels) {
        objectIds.add(r.source_object_id);
        objectIds.add(r.target_object_id);
        if (r.source_record_id !== recordId) recordIds.add(r.source_record_id);
        if (r.target_record_id !== recordId) recordIds.add(r.target_record_id);
      }

      // Resolve object names
      const { data: objects } = await (supabase
        .from("custom_objects")
        .select("id, name, icon, slug") as any)
        .in("id", Array.from(objectIds));

      const objectMap = new Map((objects || []).map((o: any) => [o.id, o]));

      // Resolve record data
      const { data: records } = await (supabase
        .from("object_records")
        .select("id, data") as any)
        .in("id", Array.from(recordIds));

      const recordMap = new Map((records || []).map((r: any) => [r.id, r.data]));

      return (rels as any[]).map((r): ObjectRelationship => {
        const srcObj = objectMap.get(r.source_object_id) as any;
        const tgtObj = objectMap.get(r.target_object_id) as any;
        return {
          ...r,
          source_object_name: srcObj?.name,
          source_object_icon: srcObj?.icon,
          source_object_slug: srcObj?.slug,
          source_record_data: recordMap.get(r.source_record_id) || {},
          target_object_name: tgtObj?.name,
          target_object_icon: tgtObj?.icon,
          target_object_slug: tgtObj?.slug,
          target_record_data: recordMap.get(r.target_record_id) || {},
        };
      });
    },
    enabled: !!currentWorkspace && !!recordId,
  });
}

export function useCreateRelationship() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: {
      source_object_id: string;
      source_record_id: string;
      target_object_id: string;
      target_record_id: string;
      relationship_type?: string;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await (supabase
        .from("object_relationships")
        .insert({
          workspace_id: currentWorkspace.id,
          relationship_type: "related_to",
          ...input,
        }) as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["object-relationships", currentWorkspace?.id, vars.source_record_id] });
      queryClient.invalidateQueries({ queryKey: ["object-relationships", currentWorkspace?.id, vars.target_record_id] });
      toast.success("Relação criada");
    },
    onError: () => toast.error("Erro ao criar relação"),
  });
}

export function useDeleteRelationship() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { id: string; recordId: string }) => {
      const { error } = await (supabase
        .from("object_relationships")
        .delete() as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["object-relationships", currentWorkspace?.id, vars.recordId] });
      toast.success("Relação removida");
    },
    onError: () => toast.error("Erro ao remover relação"),
  });
}
