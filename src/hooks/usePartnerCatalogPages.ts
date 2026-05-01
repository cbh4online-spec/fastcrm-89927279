import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  PartnerCatalogPage,
  PartnerCatalogPageItem,
  PartnerCatalogPageWithItems,
} from "@/types/partnerCatalog";

const PAGES_TABLE = "partner_catalog_pages" as const;
const ITEMS_TABLE = "partner_catalog_page_items" as const;

// ====================== READ (público para clientes) ======================
export function usePartnerCatalogPages(workspaceId: string | undefined, opts: { activeOnly?: boolean } = {}) {
  const { activeOnly = true } = opts;

  return useQuery({
    queryKey: ["partner-catalog-pages", workspaceId, activeOnly],
    enabled: !!workspaceId,
    queryFn: async (): Promise<PartnerCatalogPageWithItems[]> => {
      let pagesQuery = (supabase as any)
        .from(PAGES_TABLE)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .is("deleted_at", null)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (activeOnly) pagesQuery = pagesQuery.eq("is_active", true);

      const { data: pages, error: pagesErr } = await pagesQuery;
      if (pagesErr) throw pagesErr;

      const pageList = (pages || []) as PartnerCatalogPage[];
      if (!pageList.length) return [];

      // Items + produtos joined
      const pageIds = pageList.map((p) => p.id);
      const { data: items, error: itemsErr } = await (supabase as any)
        .from(ITEMS_TABLE)
        .select(`
          *,
          product:products!inner(id, name, sku, base_price, images, short_description, category)
        `)
        .in("page_id", pageIds)
        .order("display_order", { ascending: true });
      if (itemsErr) throw itemsErr;

      const itemsByPage = new Map<string, PartnerCatalogPageItem[]>();
      (items || []).forEach((it: PartnerCatalogPageItem) => {
        const arr = itemsByPage.get(it.page_id) || [];
        arr.push(it);
        itemsByPage.set(it.page_id, arr);
      });

      return pageList.map((p) => ({
        ...p,
        items: itemsByPage.get(p.id) || [],
      }));
    },
  });
}

// ====================== ADMIN MUTATIONS ======================
export function useCreatePartnerCatalogPage(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PartnerCatalogPage>) => {
      if (!workspaceId) throw new Error("Workspace em falta");
      const { data, error } = await (supabase as any)
        .from(PAGES_TABLE)
        .insert({
          workspace_id: workspaceId,
          title: input.title || "Nova página",
          eyebrow: input.eyebrow ?? null,
          description: input.description ?? null,
          template_key: input.template_key || "category-spread",
          theme_key: input.theme_key || "nude-cosmetic",
          hero_image_url: input.hero_image_url ?? null,
          background_color: input.background_color ?? null,
          display_order: input.display_order ?? 0,
          is_active: input.is_active ?? true,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as PartnerCatalogPage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-catalog-pages", workspaceId] });
      toast.success("Página criada");
    },
    onError: (e: Error) => toast.error(`Erro ao criar página: ${e.message}`),
  });
}

export function useUpdatePartnerCatalogPage(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PartnerCatalogPage> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from(PAGES_TABLE)
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as PartnerCatalogPage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-catalog-pages", workspaceId] });
      toast.success("Página atualizada");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useDeletePartnerCatalogPage(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from(PAGES_TABLE)
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-catalog-pages", workspaceId] });
      toast.success("Página arquivada");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

// ============= Items =============
export function useAddPageItem(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { page_id: string; product_id: string; slot?: string; display_order?: number }) => {
      const { data, error } = await (supabase as any)
        .from(ITEMS_TABLE)
        .insert({
          page_id: input.page_id,
          product_id: input.product_id,
          slot: input.slot || "main",
          display_order: input.display_order ?? 0,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-catalog-pages", workspaceId] });
    },
    onError: (e: Error) => toast.error(`Erro ao adicionar produto: ${e.message}`),
  });
}

export function useRemovePageItem(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await (supabase as any).from(ITEMS_TABLE).delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-catalog-pages", workspaceId] });
      toast.success("Produto removido");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useReorderPages(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Atualiza display_order em batch
      await Promise.all(
        orderedIds.map((id, idx) =>
          (supabase as any).from(PAGES_TABLE).update({ display_order: idx }).eq("id", id)
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-catalog-pages", workspaceId] });
    },
    onError: (e: Error) => toast.error(`Erro ao reordenar: ${e.message}`),
  });
}
