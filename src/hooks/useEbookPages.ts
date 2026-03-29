import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EbookPage, LayoutKey } from "@/types/ebook-templates";

function mapPage(row: any): EbookPage {
  return {
    ...row,
    content: row.content || {},
    style_overrides: row.style_overrides || {},
  };
}

export function useEbookPages(ebookId: string | undefined) {
  return useQuery({
    queryKey: ["ebook-pages", ebookId],
    queryFn: async () => {
      if (!ebookId) return [];
      const { data, error } = await (supabase as any)
        .from("ebook_pages")
        .select("*")
        .eq("ebook_id", ebookId)
        .order("page_order", { ascending: true });
      if (error) throw error;
      return (data || []).map(mapPage) as EbookPage[];
    },
    enabled: !!ebookId,
  });
}

export function useCreateEbookPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ebook_id: string;
      page_order: number;
      page_type?: string;
      layout_key: LayoutKey;
      content?: Record<string, unknown>;
      is_locked?: boolean;
    }) => {
      const { data, error } = await (supabase as any).from("ebook_pages").insert({
        ebook_id: input.ebook_id,
        page_order: input.page_order,
        page_type: input.page_type || "content",
        layout_key: input.layout_key,
        content: input.content || {},
        is_locked: input.is_locked || false,
      }).select().single();
      if (error) throw error;
      return mapPage(data);
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["ebook-pages", data.ebook_id] }); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateEbookPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ebook_id, ...updates }: { id: string; ebook_id: string } & Partial<Pick<EbookPage, "page_order" | "page_type" | "layout_key" | "content" | "style_overrides" | "is_locked">>) => {
      const { data, error } = await (supabase as any).from("ebook_pages")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id).select().single();
      if (error) throw error;
      return { ...mapPage(data), ebook_id };
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["ebook-pages", data.ebook_id] }); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteEbookPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ebook_id }: { id: string; ebook_id: string }) => {
      const { error } = await (supabase as any).from("ebook_pages").delete().eq("id", id);
      if (error) throw error;
      return { ebook_id };
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["ebook-pages", data.ebook_id] }); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useBulkCreateEbookPages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pages: Array<{
      ebook_id: string;
      page_order: number;
      page_type?: string;
      layout_key: LayoutKey;
      content?: Record<string, unknown>;
      is_locked?: boolean;
    }>) => {
      if (pages.length === 0) return [];
      const { data, error } = await (supabase as any).from("ebook_pages").insert(
        pages.map(p => ({
          ebook_id: p.ebook_id,
          page_order: p.page_order,
          page_type: p.page_type || "content",
          layout_key: p.layout_key,
          content: p.content || {},
          is_locked: p.is_locked || false,
        }))
      ).select();
      if (error) throw error;
      return (data || []).map(mapPage);
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        qc.invalidateQueries({ queryKey: ["ebook-pages", data[0].ebook_id] });
      }
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
