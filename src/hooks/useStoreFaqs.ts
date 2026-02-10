import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface StoreFaq {
  id: string;
  workspace_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useStoreFaqs() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["store-faqs", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("store_faqs")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as StoreFaq[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function usePublicStoreFaqs(workspaceId: string) {
  return useQuery({
    queryKey: ["store-faqs-public", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("store_faqs")
        .select("id, question, answer, sort_order")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Pick<StoreFaq, "id" | "question" | "answer" | "sort_order">[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateStoreFaq() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (faq: { question: string; answer: string; sort_order?: number }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { error } = await supabase.from("store_faqs").insert({
        workspace_id: currentWorkspace.id,
        question: faq.question,
        answer: faq.answer,
        sort_order: faq.sort_order ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-faqs"] });
      toast.success("FAQ criada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateStoreFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StoreFaq> & { id: string }) => {
      const { error } = await supabase.from("store_faqs").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-faqs"] });
      toast.success("FAQ atualizada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteStoreFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_faqs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-faqs"] });
      toast.success("FAQ eliminada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}
