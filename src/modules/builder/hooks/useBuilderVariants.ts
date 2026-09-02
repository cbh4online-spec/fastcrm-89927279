import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeBuilderHtmlForPersistence } from "../lib/sanitizeBuilderHtml";

export interface BuilderAssetVariant {
  id: string;
  asset_id: string;
  workspace_id: string;
  label: string;
  notes: string | null;
  html: string;
  is_primary: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useBuilderVariants(assetId: string | undefined) {
  return useQuery({
    queryKey: ["builder-variants", assetId],
    queryFn: async (): Promise<BuilderAssetVariant[]> => {
      if (!assetId) return [];
      const { data, error } = await supabase
        .from("builder_asset_variants")
        .select("*")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BuilderAssetVariant[];
    },
    enabled: !!assetId,
  });
}

export interface CreateVariantInput {
  assetId: string;
  workspaceId: string;
  label: string;
  html: string;
  notes?: string;
}

export function useCreateBuilderVariant() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVariantInput): Promise<BuilderAssetVariant> => {
      if (!user?.id) throw new Error("Sessão inválida");
      const cleanHtml = sanitizeBuilderHtmlForPersistence(input.html);
      const { data, error } = await supabase
        .from("builder_asset_variants")
        .insert({
          asset_id: input.assetId,
          workspace_id: input.workspaceId,
          label: input.label.trim().slice(0, 80),
          notes: input.notes?.trim() || null,
          html: cleanHtml,
          created_by: user.id,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as BuilderAssetVariant;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["builder-variants", vars.assetId] });
    },
  });
}

export function useUpdateBuilderVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; assetId: string; label?: string; notes?: string | null; html?: string }) => {
      const patch: Record<string, unknown> = {};
      if (input.label !== undefined) patch.label = input.label.trim().slice(0, 80);
      if (input.notes !== undefined) patch.notes = input.notes?.toString().trim() || null;
      if (input.html !== undefined) patch.html = sanitizeBuilderHtmlForPersistence(input.html);
      const { error } = await supabase.from("builder_asset_variants").update(patch).eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ["builder-variants", vars.assetId] });
    },
  });
}

export function useDeleteBuilderVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; assetId: string }) => {
      const { error } = await supabase.from("builder_asset_variants").delete().eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ["builder-variants", vars.assetId] });
    },
  });
}
