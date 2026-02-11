import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StoreAd {
  id: string;
  workspace_id: string;
  placement_id: string | null;
  title: string;
  image_url: string;
  link_url: string;
  alt_text: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  impressions: number;
  clicks: number;
  created_at: string;
}

export interface StoreSponsor {
  id: string;
  workspace_id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  tier: "gold" | "silver" | "bronze";
  is_active: boolean;
  sort_order: number;
}

export function useStoreAds(workspaceId: string | undefined, placementSlug?: string) {
  return useQuery({
    queryKey: ["store-ads", workspaceId, placementSlug],
    queryFn: async () => {
      if (!workspaceId) return [];
      const now = new Date().toISOString();
      let query = supabase
        .from("store_ads")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gte.${now}`);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StoreAd[];
    },
    enabled: !!workspaceId,
  });
}

export function useTrackAdImpression() {
  return useMutation({
    mutationFn: async (adId: string) => {
      const { data } = await supabase
        .from("store_ads")
        .select("impressions")
        .eq("id", adId)
        .single();
      if (data) {
        await supabase
          .from("store_ads")
          .update({ impressions: (data.impressions || 0) + 1 })
          .eq("id", adId);
      }
    },
  });
}

export function useTrackAdClick() {
  return useMutation({
    mutationFn: async (adId: string) => {
      // Simple increment via update
      const { data } = await supabase
        .from("store_ads")
        .select("clicks")
        .eq("id", adId)
        .single();
      if (data) {
        await supabase
          .from("store_ads")
          .update({ clicks: (data.clicks || 0) + 1 })
          .eq("id", adId);
      }
    },
  });
}

export function useStoreSponsors(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["store-sponsors", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("store_sponsors")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("tier")
        .order("sort_order");
      if (error) throw error;
      return (data || []) as StoreSponsor[];
    },
    enabled: !!workspaceId,
  });
}

// Admin hooks
export function useAdminStoreAds(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["admin-store-ads", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("store_ads")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StoreAd[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateStoreAd(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ad: Omit<StoreAd, "id" | "workspace_id" | "impressions" | "clicks" | "created_at">) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("store_ads").insert({ ...ad, workspace_id: workspaceId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-store-ads"] }); toast.success("Anúncio criado!"); },
    onError: () => toast.error("Erro ao criar anúncio"),
  });
}

export function useAdminStoreSponsors(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["admin-store-sponsors", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("store_sponsors")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as StoreSponsor[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateStoreSponsor(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sponsor: Omit<StoreSponsor, "id" | "workspace_id">) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("store_sponsors").insert({ ...sponsor, workspace_id: workspaceId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-store-sponsors"] }); toast.success("Parceiro adicionado!"); },
    onError: () => toast.error("Erro ao adicionar parceiro"),
  });
}

export function useUpdateStoreSponsor(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StoreSponsor> & { id: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("store_sponsors").update(updates).eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-store-sponsors"] }); toast.success("Parceiro atualizado!"); },
    onError: () => toast.error("Erro ao atualizar parceiro"),
  });
}

export function useDeleteStoreSponsor(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("store_sponsors").delete().eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-store-sponsors"] }); toast.success("Parceiro eliminado!"); },
    onError: () => toast.error("Erro ao eliminar parceiro"),
  });
}

export function useToggleSponsorActive(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("store_sponsors").update({ is_active }).eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-store-sponsors"] }); },
    onError: () => toast.error("Erro ao alterar estado"),
  });
}
