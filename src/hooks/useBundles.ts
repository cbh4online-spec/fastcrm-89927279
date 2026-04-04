import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ProductBundle {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items?: BundleItem[];
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: { id: string; name: string; price: number; images: any };
}

export function useBundles() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["product-bundles", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_bundles")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductBundle[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useBundleItems(bundleId: string | undefined) {
  return useQuery({
    queryKey: ["bundle-items", bundleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_bundle_items")
        .select("*, product:products(id, name, price, images)")
        .eq("bundle_id", bundleId!);
      if (error) throw error;
      return data as BundleItem[];
    },
    enabled: !!bundleId,
  });
}

export function useCreateBundle() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; discount_type: string; discount_value: number }) => {
      const { data, error } = await supabase
        .from("product_bundles")
        .insert({ ...input, workspace_id: currentWorkspace!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-bundles"] });
      toast.success("Bundle criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductBundle> & { id: string }) => {
      const { error } = await supabase.from("product_bundles").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-bundles"] });
      toast.success("Bundle atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_bundles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-bundles"] });
      toast.success("Bundle removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddBundleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bundle_id: string; product_id: string; quantity: number }) => {
      const { error } = await supabase.from("product_bundle_items").insert(input as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["bundle-items", vars.bundle_id] });
      toast.success("Produto adicionado ao bundle");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveBundleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bundleId }: { id: string; bundleId: string }) => {
      const { error } = await supabase.from("product_bundle_items").delete().eq("id", id);
      if (error) throw error;
      return bundleId;
    },
    onSuccess: (bundleId) => {
      qc.invalidateQueries({ queryKey: ["bundle-items", bundleId] });
      toast.success("Produto removido do bundle");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
