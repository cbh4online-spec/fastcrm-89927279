import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export type ProductSectionKey = "overview" | "how_to_use" | "specifications" | "clinical";

export const SECTION_LABELS: Record<ProductSectionKey, string> = {
  overview: "Visão Geral",
  how_to_use: "Como Usar",
  specifications: "Especificações",
  clinical: "Clínico",
};

export const SECTION_ORDER: ProductSectionKey[] = [
  "overview",
  "how_to_use",
  "specifications",
  "clinical",
];

export interface ProductContentSection {
  id: string;
  workspace_id: string;
  product_id: string;
  section_key: ProductSectionKey;
  locale: string;
  body_markdown: string | null;
  attributes: Record<string, any>;
  is_published: boolean;
  source: "manual" | "migration" | "ai_autofill" | "import";
  updated_at: string;
}

/**
 * Lê todas as secções de um produto (locale pt-PT).
 */
export function useProductContentSections(productId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["product-content-sections", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("product_content_sections")
        .select("*")
        .eq("product_id", productId!)
        .eq("locale", "pt-PT")
        .order("section_key");
      if (error) throw error;

      // Indexa por section_key para acesso rápido
      const map: Partial<Record<ProductSectionKey, ProductContentSection>> = {};
      (data || []).forEach((row: ProductContentSection) => {
        map[row.section_key] = row;
      });
      return map;
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: {
      sectionKey: ProductSectionKey;
      bodyMarkdown?: string | null;
      attributes?: Record<string, any>;
    }) => {
      const { data, error } = await sb.rpc("upsert_product_section", {
        p_product_id: productId,
        p_section_key: payload.sectionKey,
        p_body_markdown: payload.bodyMarkdown ?? null,
        p_attributes: payload.attributes ?? {},
        p_locale: "pt-PT",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-content-sections", productId] });
      toast.success("Secção guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { sections: query.data || {}, isLoading: query.isLoading, upsert };
}

/**
 * Versão pública (Copilot / cliente B2B) — usa RPC com permissões expandidas.
 */
export function useProductFullContent(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-full-content", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await sb.rpc("get_product_full_content", {
        p_product_id: productId,
        p_locale: "pt-PT",
      });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Pesquisa cross-produtos (RAG-friendly).
 */
export async function searchProductSections(
  workspaceId: string,
  query: string,
  sectionKey?: ProductSectionKey,
  limit = 10,
) {
  const { data, error } = await sb.rpc("search_product_sections", {
    p_workspace_id: workspaceId,
    p_query: query,
    p_section_key: sectionKey || null,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}
