import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EbookCta {
  id: string;
  ebook_id: string;
  workspace_id: string;
  chapter_id: string | null;
  label: string;
  cta_type: string;
  target_url: string | null;
  position: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useEbookCtas(ebookId: string | undefined) {
  return useQuery({
    queryKey: ["ebook-ctas", ebookId],
    queryFn: async () => {
      if (!ebookId) return [];
      const { data, error } = await (supabase as any)
        .from("ebook_ctas")
        .select("*")
        .eq("ebook_id", ebookId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as EbookCta[];
    },
    enabled: !!ebookId,
  });
}

export function useCreateEbookCta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<EbookCta, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await (supabase as any)
        .from("ebook_ctas")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as EbookCta;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ebook-ctas", data.ebook_id] });
      toast.success("CTA criado");
    },
    onError: (e: Error) => toast.error("Erro ao criar CTA: " + e.message),
  });
}

export function useUpdateEbookCta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; ebook_id: string } & Partial<EbookCta>) => {
      const { data, error } = await (supabase as any)
        .from("ebook_ctas")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as EbookCta;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ebook-ctas", data.ebook_id] });
    },
    onError: (e: Error) => toast.error("Erro ao atualizar CTA: " + e.message),
  });
}

export function useDeleteEbookCta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ebookId }: { id: string; ebookId: string }) => {
      const { error } = await (supabase as any).from("ebook_ctas").delete().eq("id", id);
      if (error) throw error;
      return ebookId;
    },
    onSuccess: (ebookId) => {
      qc.invalidateQueries({ queryKey: ["ebook-ctas", ebookId] });
      toast.success("CTA eliminado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export async function trackCtaEvent(params: {
  ebook_id: string;
  cta_id: string;
  view_id?: string;
  workspace_id: string;
  chapter_id?: string;
  event_type: "cta_impression" | "cta_click" | "cta_conversion";
}) {
  await (supabase as any).from("ebook_cta_events").insert({
    ebook_id: params.ebook_id,
    cta_id: params.cta_id,
    view_id: params.view_id || null,
    workspace_id: params.workspace_id,
    chapter_id: params.chapter_id || null,
    event_type: params.event_type,
  });
}
