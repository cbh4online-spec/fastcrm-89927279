import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BuilderBlock } from "@/lib/figmaSectionMapper";
import { toast } from "sonner";

export function useLandingPageSections(pageId: string | undefined) {
  return useQuery({
    queryKey: ["landing-page-sections", pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_page_sections")
        .select("*")
        .eq("landing_page_id", pageId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as BuilderBlock[];
    },
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content, section_name }: { id: string; content: Record<string, unknown>; section_name?: string }) => {
      const updates: Record<string, unknown> = { content };
      if (section_name !== undefined) updates.section_name = section_name;
      const { error } = await supabase
        .from("landing_page_sections")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["landing-page-sections"] });
      toast.success("Secção guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("landing_page_sections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["landing-page-sections"] });
      toast.success("Secção removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
