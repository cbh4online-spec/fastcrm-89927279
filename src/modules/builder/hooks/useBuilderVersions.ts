import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeBuilderHtmlForPersistence } from "../lib/sanitizeBuilderHtml";

export interface BuilderAssetVersion {
  id: string;
  asset_id: string;
  workspace_id: string;
  version_number: number;
  html: string;
  css: string | null;
  metadata: Record<string, unknown>;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export function useBuilderVersions(assetId: string | undefined) {
  return useQuery({
    queryKey: ["builder-versions", assetId],
    queryFn: async (): Promise<BuilderAssetVersion[]> => {
      if (!assetId) return [];
      const { data, error } = await supabase
        .from("builder_asset_versions")
        .select("*")
        .eq("asset_id", assetId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BuilderAssetVersion[];
    },
    enabled: !!assetId,
  });
}

export interface CreateBuilderVersionInput {
  assetId: string;
  workspaceId: string;
  html: string;
  notes?: string;
}

export function useCreateBuilderVersion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBuilderVersionInput): Promise<BuilderAssetVersion> => {
      if (!user?.id) throw new Error("Sessão inválida");

      const { data: last } = await supabase
        .from("builder_asset_versions")
        .select("version_number")
        .eq("asset_id", input.assetId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNumber = (last?.version_number ?? 0) + 1;
      const cleanHtml = sanitizeBuilderHtmlForPersistence(input.html);

      const { data, error } = await supabase
        .from("builder_asset_versions")
        .insert({
          asset_id: input.assetId,
          workspace_id: input.workspaceId,
          version_number: nextNumber,
          html: cleanHtml,
          notes: input.notes?.trim() || null,
          created_by: user.id,
          metadata: {},
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as BuilderAssetVersion;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["builder-versions", vars.assetId] });
    },
  });
}
