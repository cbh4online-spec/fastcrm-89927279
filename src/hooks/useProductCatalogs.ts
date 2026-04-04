import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductCatalog {
  id: string;
  workspace_id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  cover_image: string | null;
  style_tokens: Record<string, unknown>;
  settings: CatalogSettings;
  status: "draft" | "published";
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogSettings {
  products_per_page: 1 | 2 | 4;
  show_prices: boolean;
  show_descriptions: boolean;
  watermark: boolean;
}

export interface ProductCatalogItem {
  id: string;
  catalog_id: string;
  product_id: string;
  sort_order: number;
  custom_title: string | null;
  custom_description: string | null;
  custom_image: string | null;
  page_break_before: boolean;
  created_at: string;
  product?: {
    id: string;
    name: string;
    short_description: string | null;
    base_price: number;
    pvp_recommended: number | null;
    images: string[] | null;
    currency: string;
  };
}

export function useProductCatalogs(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["product-catalogs", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("product_catalogs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ProductCatalog[];
    },
    enabled: !!workspaceId,
  });
}

export function useProductCatalog(catalogId: string | undefined) {
  return useQuery({
    queryKey: ["product-catalog", catalogId],
    queryFn: async () => {
      if (!catalogId) return null;
      const { data, error } = await supabase
        .from("product_catalogs")
        .select("*")
        .eq("id", catalogId)
        .single();
      if (error) throw error;
      return data as unknown as ProductCatalog;
    },
    enabled: !!catalogId,
  });
}

export function useProductCatalogBySlug(workspaceSlug: string | undefined, catalogSlug: string | undefined) {
  return useQuery({
    queryKey: ["product-catalog-slug", workspaceSlug, catalogSlug],
    queryFn: async () => {
      if (!workspaceSlug || !catalogSlug) return null;
      const { data: ws, error: wsErr } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceSlug)
        .single();
      if (wsErr) throw wsErr;
      
      const { data, error } = await supabase
        .from("product_catalogs")
        .select("*")
        .eq("workspace_id", ws.id)
        .eq("slug", catalogSlug)
        .eq("status", "published")
        .eq("is_public", true)
        .single();
      if (error) throw error;
      return data as unknown as ProductCatalog;
    },
    enabled: !!workspaceSlug && !!catalogSlug,
  });
}

export function useProductCatalogItems(catalogId: string | undefined) {
  return useQuery({
    queryKey: ["product-catalog-items", catalogId],
    queryFn: async () => {
      if (!catalogId) return [];
      const { data, error } = await supabase
        .from("product_catalog_items")
        .select("*, product:products(id, name, short_description, base_price, pvp_recommended, images, currency)")
        .eq("catalog_id", catalogId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ProductCatalogItem[];
    },
    enabled: !!catalogId,
  });
}

export function usePublicCatalogItems(catalogId: string | undefined) {
  return useQuery({
    queryKey: ["public-catalog-items", catalogId],
    queryFn: async () => {
      if (!catalogId) return [];
      const { data, error } = await supabase
        .from("product_catalog_items")
        .select("*, product:products(id, name, short_description, base_price, pvp_recommended, images, currency)")
        .eq("catalog_id", catalogId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ProductCatalogItem[];
    },
    enabled: !!catalogId,
  });
}

export function useCreateCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workspace_id: string;
      title: string;
      slug: string;
      subtitle?: string;
      description?: string;
      cover_image?: string;
      style_tokens?: Record<string, unknown>;
      settings?: Partial<CatalogSettings>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("product_catalogs")
        .insert({
          workspace_id: input.workspace_id,
          title: input.title,
          slug: input.slug,
          subtitle: input.subtitle || null,
          description: input.description || null,
          cover_image: input.cover_image || null,
          style_tokens: input.style_tokens || {},
          settings: { products_per_page: 2, show_prices: true, show_descriptions: true, watermark: false, ...input.settings } as unknown as Record<string, unknown>,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProductCatalog;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-catalogs", vars.workspace_id] });
      toast.success("Catálogo criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductCatalog> & { id: string }) => {
      const { error } = await supabase
        .from("product_catalogs")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-catalog"] });
      qc.invalidateQueries({ queryKey: ["product-catalogs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_catalogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-catalogs"] });
      toast.success("Catálogo eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { catalog_id: string; product_id: string; sort_order: number }) => {
      const { error } = await supabase.from("product_catalog_items").insert(input);
      if (error) {
        if (error.code === "23505") throw new Error("Produto já está no catálogo");
        throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-catalog-items", vars.catalog_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, catalogId }: { id: string; catalogId: string }) => {
      const { error } = await supabase.from("product_catalog_items").delete().eq("id", id);
      if (error) throw error;
      return catalogId;
    },
    onSuccess: (catalogId) => {
      qc.invalidateQueries({ queryKey: ["product-catalog-items", catalogId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReorderCatalogItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ items, catalogId }: { items: { id: string; sort_order: number }[]; catalogId: string }) => {
      for (const item of items) {
        const { error } = await supabase
          .from("product_catalog_items")
          .update({ sort_order: item.sort_order })
          .eq("id", item.id);
        if (error) throw error;
      }
      return catalogId;
    },
    onSuccess: (catalogId) => {
      qc.invalidateQueries({ queryKey: ["product-catalog-items", catalogId] });
    },
  });
}
