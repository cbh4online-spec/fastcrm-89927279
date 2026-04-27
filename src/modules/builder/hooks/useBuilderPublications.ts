import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BuilderPublication {
  id: string;
  asset_id: string;
  workspace_id: string;
  version_id: string | null;
  publication_number: number;
  html: string;
  notes: string | null;
  is_rollback: boolean;
  rolled_back_from: string | null;
  is_active: boolean;
  published_by: string;
  published_at: string;
  unpublished_at: string | null;
}

export function useBuilderPublications(assetId: string | undefined) {
  return useQuery({
    queryKey: ["builder-publications", assetId],
    queryFn: async (): Promise<BuilderPublication[]> => {
      if (!assetId) return [];
      const { data, error } = await supabase
        .from("builder_publications")
        .select("*")
        .eq("asset_id", assetId)
        .order("publication_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BuilderPublication[];
    },
    enabled: !!assetId,
  });
}

export interface PublishInput {
  assetId: string;
  html: string;
  versionId?: string | null;
  notes?: string;
  isRollback?: boolean;
  rolledBackFrom?: string;
}

export function usePublishBuilderAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PublishInput): Promise<BuilderPublication> => {
      const { data, error } = await supabase.rpc("publish_builder_asset", {
        _asset_id: input.assetId,
        _html: input.html,
        _version_id: input.versionId ?? null,
        _notes: input.notes ?? null,
        _is_rollback: input.isRollback ?? false,
        _rolled_back_from: input.rolledBackFrom ?? null,
      });
      if (error) throw error;
      return data as unknown as BuilderPublication;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["builder-publications", vars.assetId] });
      queryClient.invalidateQueries({ queryKey: ["builder-asset", vars.assetId] });
      queryClient.invalidateQueries({ queryKey: ["builder-assets"] });
    },
  });
}

export interface BuilderAssetDomain {
  id: string;
  asset_id: string;
  workspace_id: string;
  hostname: string;
  path_prefix: string;
  is_primary: boolean;
  verified: boolean;
  verification_token: string;
  created_at: string;
  updated_at: string;
}

export function useBuilderAssetDomains(assetId: string | undefined) {
  return useQuery({
    queryKey: ["builder-asset-domains", assetId],
    queryFn: async (): Promise<BuilderAssetDomain[]> => {
      if (!assetId) return [];
      const { data, error } = await supabase
        .from("builder_asset_domains")
        .select("*")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BuilderAssetDomain[];
    },
    enabled: !!assetId,
  });
}

export function useAddBuilderAssetDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assetId: string;
      workspaceId: string;
      hostname: string;
      pathPrefix?: string;
    }) => {
      const { data, error } = await supabase
        .from("builder_asset_domains")
        .insert({
          asset_id: input.assetId,
          workspace_id: input.workspaceId,
          hostname: input.hostname.toLowerCase().trim(),
          path_prefix: input.pathPrefix?.trim() || "/",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as BuilderAssetDomain;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["builder-asset-domains", vars.assetId] });
    },
  });
}

export function useDeleteBuilderAssetDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; assetId: string }) => {
      const { error } = await supabase
        .from("builder_asset_domains")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["builder-asset-domains", vars.assetId] });
    },
  });
}

export interface DomainVerifyResult {
  verified: boolean;
  record_host: string;
  expected_token: string;
  found_records: string[];
}

export function useVerifyBuilderDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      domainId: string;
      assetId: string;
    }): Promise<DomainVerifyResult> => {
      const { data, error } = await supabase.functions.invoke(
        "builder-domain-verify",
        { body: { domain_id: input.domainId } },
      );
      if (error) throw error;
      return data as DomainVerifyResult;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["builder-asset-domains", vars.assetId],
      });
    },
  });
}
